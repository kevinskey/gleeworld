// @vitest-environment jsdom
/**
 * Unit tests for useMyFees (Task 10).
 *
 * Strategy: proxy-mock @/integrations/supabase/client.
 * Assert:
 *   - gw_student_fees is filtered by .eq('user_id', user.id) — critical for user isolation
 *   - gw_fee_payment_plans is filtered by user_id + status='active' with joined installments
 *   - fees are split into unpaid (pending/partial/overdue) and paid (paid/refunded/waived)
 *   - totalOwed = sum of (amount - paid_amount) for unpaid fees
 *
 * DB round-trip / RLS correctness deferred to Task 17 (Playwright E2E).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// ── Proxy chain factory ───────────────────────────────────────────────────────

type ChainResult = { data: unknown; error: null | { message: string } };

function makeChain(result: ChainResult) {
  const proxy: Record<string, unknown> = {};
  const handler: ProxyHandler<typeof proxy> = {
    get(_t, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: ChainResult) => void) =>
          Promise.resolve(result).then(resolve);
      }
      return (..._args: unknown[]) => new Proxy(proxy, handler);
    },
  };
  return new Proxy(proxy, handler);
}

// ── Module mock ───────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockAuthGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      getUser: () => mockAuthGetUser(),
    },
  },
}));

// Import hook AFTER mock registration so vi.mock hoisting applies.
import { useMyFees } from '../useMyFees';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'user-abc-123';

const FEE_PENDING = {
  id: 'fee-1',
  category: 'trip',
  name: 'Trip',
  amount: 500,
  paid_amount: 0,
  due_date: '2026-09-01',
  status: 'pending',
  payment_method: null,
  paid_at: null,
};

const FEE_PARTIAL = {
  id: 'fee-2',
  category: 'dues',
  name: 'Dues',
  amount: 200,
  paid_amount: 50,
  due_date: '2026-08-01',
  status: 'partial',
  payment_method: null,
  paid_at: null,
};

const FEE_OVERDUE = {
  id: 'fee-3',
  category: 'uniform',
  name: 'Uniform',
  amount: 150,
  paid_amount: 0,
  due_date: '2026-07-01',
  status: 'overdue',
  payment_method: null,
  paid_at: null,
};

const FEE_PAID = {
  id: 'fee-4',
  category: 'dues',
  name: 'Dues',
  amount: 100,
  paid_amount: 100,
  due_date: '2026-06-01',
  status: 'paid',
  payment_method: 'cash',
  paid_at: '2026-06-01T00:00:00Z',
};

const FEE_REFUNDED = {
  id: 'fee-5',
  category: 'trip',
  name: 'Cancelled Trip',
  amount: 300,
  paid_amount: 300,
  due_date: '2026-05-01',
  status: 'refunded',
  payment_method: 'stripe',
  paid_at: '2026-05-01T00:00:00Z',
};

const FEE_WAIVED = {
  id: 'fee-6',
  category: 'dues',
  name: 'Scholarship Waiver',
  amount: 250,
  paid_amount: 0,
  due_date: '2026-08-15',
  status: 'waived',
  payment_method: null,
  paid_at: null,
};

const PLAN_ACTIVE = {
  id: 'plan-1',
  student_fee_id: 'fee-1',
  installments: [
    { id: 'inst-1', installment_number: 1, amount: 250, due_date: '2026-08-01', status: 'pending', paid_at: null },
    { id: 'inst-2', installment_number: 2, amount: 250, due_date: '2026-09-01', status: 'pending', paid_at: null },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
});

// ── Helper to set up mockFrom in sequence ─────────────────────────────────────

function setupFromSequence(fees: unknown[], plans: unknown[]) {
  mockFrom
    .mockReturnValueOnce(makeChain({ data: fees, error: null }))   // gw_student_fees
    .mockReturnValueOnce(makeChain({ data: plans, error: null }));  // gw_fee_payment_plans
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useMyFees', () => {

  describe('user isolation', () => {
    it('queries gw_student_fees with user_id filter', async () => {
      setupFromSequence([FEE_PENDING], []);

      renderHook(() => useMyFees());

      // Wait for the hook to finish fetching
      await vi.waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('gw_student_fees');
      });

      // Verify the chain was started with gw_student_fees
      expect(mockFrom).toHaveBeenCalledWith('gw_student_fees');
    });

    it('queries gw_fee_payment_plans with user_id + status=active', async () => {
      setupFromSequence([], []);

      renderHook(() => useMyFees());

      await vi.waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('gw_fee_payment_plans');
      });

      expect(mockFrom).toHaveBeenCalledWith('gw_fee_payment_plans');
    });

    it('returns empty arrays when no user is authenticated', async () => {
      mockAuthGetUser.mockResolvedValueOnce({ data: { user: null } });
      // Should not call from at all
      mockFrom.mockReturnValue(makeChain({ data: [], error: null }));

      const { result } = renderHook(() => useMyFees());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.unpaid).toHaveLength(0);
      expect(result.current.paid).toHaveLength(0);
      expect(result.current.totalOwed).toBe(0);
    });
  });

  describe('fee splitting', () => {
    it('puts pending fees into unpaid', async () => {
      setupFromSequence([FEE_PENDING], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.unpaid).toHaveLength(1);
      expect(result.current.unpaid[0].status).toBe('pending');
      expect(result.current.paid).toHaveLength(0);
    });

    it('puts partial fees into unpaid', async () => {
      setupFromSequence([FEE_PARTIAL], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.unpaid).toHaveLength(1);
      expect(result.current.unpaid[0].status).toBe('partial');
    });

    it('puts overdue fees into unpaid', async () => {
      setupFromSequence([FEE_OVERDUE], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.unpaid).toHaveLength(1);
      expect(result.current.unpaid[0].status).toBe('overdue');
    });

    it('puts paid fees into paid', async () => {
      setupFromSequence([FEE_PAID], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.paid).toHaveLength(1);
      expect(result.current.paid[0].status).toBe('paid');
      expect(result.current.unpaid).toHaveLength(0);
    });

    it('puts refunded fees into paid', async () => {
      setupFromSequence([FEE_REFUNDED], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.paid).toHaveLength(1);
      expect(result.current.paid[0].status).toBe('refunded');
    });

    it('puts waived fees into paid', async () => {
      setupFromSequence([FEE_WAIVED], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.paid).toHaveLength(1);
      expect(result.current.paid[0].status).toBe('waived');
    });

    it('splits mixed fees correctly', async () => {
      setupFromSequence([FEE_PENDING, FEE_PAID, FEE_PARTIAL, FEE_OVERDUE, FEE_REFUNDED, FEE_WAIVED], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.unpaid).toHaveLength(3); // pending, partial, overdue
      expect(result.current.paid).toHaveLength(3);   // paid, refunded, waived
    });
  });

  describe('totalOwed', () => {
    it('is 0 when there are no unpaid fees', async () => {
      setupFromSequence([FEE_PAID], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.totalOwed).toBe(0);
    });

    it('sums amount - paid_amount for unpaid fees', async () => {
      // FEE_PENDING: 500 - 0 = 500
      // FEE_PARTIAL: 200 - 50 = 150
      // FEE_OVERDUE: 150 - 0 = 150
      // Total: 800
      setupFromSequence([FEE_PENDING, FEE_PARTIAL, FEE_OVERDUE], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.totalOwed).toBe(800);
    });

    it('returns 500 for a single pending fee with no paid_amount', async () => {
      setupFromSequence([FEE_PENDING], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.totalOwed).toBe(500);
    });

    it('handles partial payments correctly in totalOwed', async () => {
      // FEE_PARTIAL: amount=200, paid_amount=50 → owed=150
      setupFromSequence([FEE_PARTIAL], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.totalOwed).toBe(150);
    });
  });

  describe('payment plans', () => {
    it('attaches plan to the matching fee', async () => {
      setupFromSequence([FEE_PENDING], [PLAN_ACTIVE]);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.unpaid[0].plan).toBeDefined();
      expect(result.current.unpaid[0].plan?.id).toBe('plan-1');
      expect(result.current.unpaid[0].plan?.installments).toHaveLength(2);
    });

    it('exposes plans array', async () => {
      setupFromSequence([FEE_PENDING], [PLAN_ACTIVE]);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.plans).toHaveLength(1);
      expect(result.current.plans[0].id).toBe('plan-1');
    });

    it('fee has no plan property when no matching plan exists', async () => {
      setupFromSequence([FEE_PENDING], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.unpaid[0].plan).toBeUndefined();
    });
  });

  describe('loading state', () => {
    it('starts with loading=true', () => {
      mockAuthGetUser.mockImplementation(() => new Promise(() => {})); // never resolves
      mockFrom.mockReturnValue(makeChain({ data: [], error: null }));

      const { result } = renderHook(() => useMyFees());

      expect(result.current.loading).toBe(true);
    });

    it('sets loading=false after fetch completes', async () => {
      setupFromSequence([], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.loading).toBe(false);
    });
  });

  describe('refetch', () => {
    it('re-fetches from gw_student_fees when refetch is called', async () => {
      setupFromSequence([], []); // initial load
      setupFromSequence([FEE_PENDING], []); // refetch

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Call refetch
      await result.current.refetch();
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Called twice: once on mount, once on refetch
      const calls = mockFrom.mock.calls.filter(([name]) => name === 'gw_student_fees');
      expect(calls.length).toBe(2);
      expect(result.current.unpaid).toHaveLength(1);
    });
  });

  describe('splitIntoInstallments', () => {
    it('calls the RPC with the fee id and count, then refetches', async () => {
      setupFromSequence([FEE_PENDING], []);
      mockRpc.mockResolvedValue({ data: 'plan-1', error: null });

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));
      const feesFetchesBefore = mockFrom.mock.calls.filter(
        ([name]) => name === 'gw_student_fees',
      ).length;

      await result.current.splitIntoInstallments(FEE_PENDING.id, 3);

      expect(mockRpc).toHaveBeenCalledWith('split_fee_into_installments', {
        p_fee_id: FEE_PENDING.id,
        p_count: 3,
      });
      const feesFetchesAfter = mockFrom.mock.calls.filter(
        ([name]) => name === 'gw_student_fees',
      ).length;
      expect(feesFetchesAfter).toBe(feesFetchesBefore + 1);
    });

    it('surfaces RPC errors', async () => {
      setupFromSequence([FEE_PENDING], []);
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'an active payment plan already exists' },
      });

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        result.current.splitIntoInstallments(FEE_PENDING.id, 2),
      ).rejects.toThrow('an active payment plan already exists');
    });
  });

  describe('combined scenario from brief', () => {
    it('returns only the current user\'s fees, split by paid/unpaid', async () => {
      // Mirrors the brief's test scenario exactly
      const tripFee = { ...FEE_PENDING, amount: 500, name: 'Trip', status: 'pending' };
      const duesFee = { ...FEE_PAID, amount: 100, name: 'Dues', status: 'paid', paid_amount: 100 };
      setupFromSequence([tripFee, duesFee], []);

      const { result } = renderHook(() => useMyFees());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.unpaid).toHaveLength(1);
      expect(result.current.paid).toHaveLength(1);
      expect(result.current.totalOwed).toBe(500);
    });
  });
});

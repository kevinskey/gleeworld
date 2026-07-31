// @vitest-environment jsdom
/**
 * Unit tests for useFeesManagement payment RPC methods (Task 6).
 *
 * Strategy: proxy-mock @/integrations/supabase/client.
 * Assert the three RPC calls via mockRpc and verify fetchStudentFees is called
 * after each operation (state refresh).
 *
 * DB round-trip / RLS correctness is deferred to Task 17 (Playwright E2E).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Module mock ───────────────────────────────────────────────────────────────

const mockRpc = vi.fn();
const mockFrom = vi.fn();

// fetchStudentFees uses supabase.from(...).select(...).order(...)
// We need it to resolve without error so the hook doesn't toast-error.
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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ── Import hook AFTER mock registration ──────────────────────────────────────

import { useFeesManagement } from '../useFeesManagement';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FEE_ID = 'fee-uuid-0001';

beforeEach(() => {
  vi.clearAllMocks();
  // Default: from().select().order() → empty list (no error)
  mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useFeesManagement payment RPCs', () => {

  describe('recordPayment', () => {
    it('calls record_fee_payment RPC with correct args', async () => {
      mockRpc.mockResolvedValueOnce({ data: { id: FEE_ID, status: 'paid' }, error: null });

      const { result } = renderHook(() => useFeesManagement());

      await act(async () => {
        await result.current.recordPayment(FEE_ID, 'cash', 500);
      });

      expect(mockRpc).toHaveBeenCalledWith('record_fee_payment', {
        p_fee_id: FEE_ID,
        p_method: 'cash',
        p_amount: 500,
        p_reference: null,
      });
    });

    it('passes reference when provided', async () => {
      mockRpc.mockResolvedValueOnce({ data: { id: FEE_ID, status: 'partial' }, error: null });

      const { result } = renderHook(() => useFeesManagement());

      await act(async () => {
        await result.current.recordPayment(FEE_ID, 'check', 200, '#1234');
      });

      expect(mockRpc).toHaveBeenCalledWith('record_fee_payment', {
        p_fee_id: FEE_ID,
        p_method: 'check',
        p_amount: 200,
        p_reference: '#1234',
      });
    });

    it('calls fetchStudentFees after recording payment', async () => {
      mockRpc.mockResolvedValueOnce({ data: { id: FEE_ID, status: 'paid' }, error: null });

      const { result } = renderHook(() => useFeesManagement());
      // Clear the initial mount call to from()
      mockFrom.mockClear();
      mockFrom.mockReturnValue(makeChain({ data: [], error: null }));

      await act(async () => {
        await result.current.recordPayment(FEE_ID, 'cash', 500);
      });

      // fetchStudentFees calls supabase.from('gw_student_fees')
      expect(mockFrom).toHaveBeenCalledWith('gw_student_fees');
    });

    it('throws when RPC returns an error', async () => {
      const rpcError = { message: 'amount exceeds remaining 300' };
      mockRpc.mockResolvedValueOnce({ data: null, error: rpcError });

      const { result } = renderHook(() => useFeesManagement());

      await expect(
        act(async () => {
          await result.current.recordPayment(FEE_ID, 'cash', 9999);
        }),
      ).rejects.toMatchObject({ message: 'amount exceeds remaining 300' });
    });
  });

  describe('refundFee', () => {
    it('calls refund_fee RPC with correct args', async () => {
      mockRpc.mockResolvedValueOnce({ data: { id: FEE_ID, status: 'refunded' }, error: null });

      const { result } = renderHook(() => useFeesManagement());

      await act(async () => {
        await result.current.refundFee(FEE_ID, 'trip cancelled');
      });

      expect(mockRpc).toHaveBeenCalledWith('refund_fee', {
        p_fee_id: FEE_ID,
        p_note: 'trip cancelled',
      });
    });

    it('calls fetchStudentFees after refund', async () => {
      mockRpc.mockResolvedValueOnce({ data: { id: FEE_ID, status: 'refunded' }, error: null });

      const { result } = renderHook(() => useFeesManagement());
      mockFrom.mockClear();
      mockFrom.mockReturnValue(makeChain({ data: [], error: null }));

      await act(async () => {
        await result.current.refundFee(FEE_ID, 'trip cancelled');
      });

      expect(mockFrom).toHaveBeenCalledWith('gw_student_fees');
    });

    it('throws when RPC returns an error', async () => {
      const rpcError = { message: 'fee not found' };
      mockRpc.mockResolvedValueOnce({ data: null, error: rpcError });

      const { result } = renderHook(() => useFeesManagement());

      await expect(
        act(async () => {
          await result.current.refundFee('nonexistent-uuid', 'test');
        }),
      ).rejects.toMatchObject({ message: 'fee not found' });
    });
  });

  describe('waiveFee', () => {
    it('calls waive_fee RPC with correct args', async () => {
      mockRpc.mockResolvedValueOnce({ data: { id: FEE_ID, status: 'waived' }, error: null });

      const { result } = renderHook(() => useFeesManagement());

      await act(async () => {
        await result.current.waiveFee(FEE_ID, 'scholarship awarded');
      });

      expect(mockRpc).toHaveBeenCalledWith('waive_fee', {
        p_fee_id: FEE_ID,
        p_note: 'scholarship awarded',
      });
    });

    it('calls fetchStudentFees after waive', async () => {
      mockRpc.mockResolvedValueOnce({ data: { id: FEE_ID, status: 'waived' }, error: null });

      const { result } = renderHook(() => useFeesManagement());
      mockFrom.mockClear();
      mockFrom.mockReturnValue(makeChain({ data: [], error: null }));

      await act(async () => {
        await result.current.waiveFee(FEE_ID, 'scholarship awarded');
      });

      expect(mockFrom).toHaveBeenCalledWith('gw_student_fees');
    });

    it('throws when RPC returns an error', async () => {
      const rpcError = { message: 'fee not found' };
      mockRpc.mockResolvedValueOnce({ data: null, error: rpcError });

      const { result } = renderHook(() => useFeesManagement());

      await expect(
        act(async () => {
          await result.current.waiveFee('nonexistent-uuid', 'test');
        }),
      ).rejects.toMatchObject({ message: 'fee not found' });
    });
  });
});

// @vitest-environment jsdom
/**
 * Propagation tests for useFeeTemplates.updateTemplate → update_fee_template RPC.
 *
 * Strategy: proxy-mock (same as Tasks 3-4).  We verify that:
 *   1. supabase.rpc('update_fee_template', { p_template_id, p_patch }) is
 *      called with the exact arguments the hook passes.
 *   2. The hook re-fetches installments after the RPC call.
 *   3. The resolved FeeTemplate is returned to the caller.
 *
 * The "only pending rows propagate" invariant is enforced in the SQL RPC and
 * is deferred to Task 17 Playwright E2E tests (live-DB round-trip).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FeeTemplate } from '../useFeeTemplates';

// ── Module mock ───────────────────────────────────────────────────────────────

const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: () => mockGetUser() },
  },
}));

import { useFeeTemplates } from '../useFeeTemplates';

// ── Fluent-chain builder (mirrors Tasks 3-4 proxy pattern) ────────────────────

type ChainResult = { data: unknown; error: null | { message: string } };

function makeChain(result: ChainResult) {
  const calls: Record<string, unknown[][]> = {};
  const record = (method: string, args: unknown[]) => {
    (calls[method] ??= []).push(args);
  };

  const proxy: Record<string, unknown> = {};
  const handler: ProxyHandler<typeof proxy> = {
    get(_target, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: ChainResult) => void) => Promise.resolve(result).then(resolve);
      }
      if (prop === '_calls') return calls;
      return (...args: unknown[]) => {
        record(prop, args);
        return new Proxy(proxy, handler);
      };
    },
  };

  return new Proxy(proxy, handler) as unknown as {
    _calls: Record<string, unknown[][]>;
  } & Record<string, (...a: unknown[]) => unknown>;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FAKE_USER = { id: 'user-123' };

const fakeTpl = {
  id: 'tpl-42',
  tenant_id: 'tenant-abc',
  category: 'trip',
  name: 'Band Trip 2026',
  description: null,
  total_amount: 500,
  currency: 'USD',
  due_date: '2026-10-01',
  allow_self_serve_split: true,
  context_type: null,
  context_id: null,
  created_by: FAKE_USER.id,
  created_at: '2026-07-30T00:00:00Z',
  updated_at: '2026-07-30T00:00:00Z',
  archived_at: null,
};

const fakeInstallments = [
  { id: 'ins-1', template_id: 'tpl-42', sequence: 1, amount: 250, due_date: '2026-10-01' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: FAKE_USER }, error: null });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('template edit propagation', () => {
  it('calls rpc("update_fee_template") with p_template_id and p_patch', async () => {
    const updatedTpl = { ...fakeTpl, total_amount: 600, name: 'Band Trip 2026' };
    const instChain = makeChain({ data: fakeInstallments, error: null });

    mockRpc.mockResolvedValueOnce({ data: updatedTpl, error: null });
    mockFrom.mockReturnValueOnce(instChain);

    const { result } = renderHook(() => useFeeTemplates());

    await act(async () => {
      await result.current.updateTemplate('tpl-42', { total_amount: 600 });
    });

    expect(mockRpc).toHaveBeenCalledWith('update_fee_template', {
      p_template_id: 'tpl-42',
      p_patch: { total_amount: 600 },
    });
  });

  it('re-fetches installments after the RPC returns', async () => {
    const updatedTpl = { ...fakeTpl, total_amount: 600 };
    const instChain = makeChain({ data: fakeInstallments, error: null });

    mockRpc.mockResolvedValueOnce({ data: updatedTpl, error: null });
    mockFrom.mockReturnValueOnce(instChain);

    const { result } = renderHook(() => useFeeTemplates());

    await act(async () => {
      await result.current.updateTemplate('tpl-42', { total_amount: 600 });
    });

    // Installments re-fetch must happen AFTER the RPC resolves.
    const rpcOrder = mockRpc.mock.invocationCallOrder[0];
    const fromOrder = mockFrom.mock.invocationCallOrder[0];
    expect(fromOrder).toBeGreaterThan(rpcOrder);

    expect(mockFrom).toHaveBeenCalledWith('gw_fee_template_installments');

    const eqCalls = (instChain._calls['eq'] ?? []) as unknown[][];
    const templateFilter = eqCalls.find((c) => c[0] === 'template_id');
    expect(templateFilter).toBeDefined();
    expect(templateFilter![1]).toBe('tpl-42');
  });

  it('returns a FeeTemplate with the updated data and re-fetched installments', async () => {
    const updatedTpl = { ...fakeTpl, total_amount: 600 };
    const instChain = makeChain({ data: fakeInstallments, error: null });

    mockRpc.mockResolvedValueOnce({ data: updatedTpl, error: null });
    mockFrom.mockReturnValueOnce(instChain);

    const { result } = renderHook(() => useFeeTemplates());

    let updated!: FeeTemplate;
    await act(async () => {
      updated = await result.current.updateTemplate('tpl-42', { total_amount: 600 });
    });

    expect(updated.id).toBe('tpl-42');
    expect(updated.total_amount).toBe(600);
    expect(updated.installments).toHaveLength(1);
    expect(updated.installments[0].amount).toBe(250);
  });

  it('passes multi-field patch correctly to the RPC', async () => {
    const updatedTpl = { ...fakeTpl, total_amount: 750, name: 'Updated Trip', due_date: '2026-11-01' };
    const instChain = makeChain({ data: [], error: null });

    mockRpc.mockResolvedValueOnce({ data: updatedTpl, error: null });
    mockFrom.mockReturnValueOnce(instChain);

    const { result } = renderHook(() => useFeeTemplates());

    await act(async () => {
      await result.current.updateTemplate('tpl-42', {
        total_amount: 750,
        name: 'Updated Trip',
        due_date: '2026-11-01',
      });
    });

    expect(mockRpc).toHaveBeenCalledWith('update_fee_template', {
      p_template_id: 'tpl-42',
      p_patch: { total_amount: 750, name: 'Updated Trip', due_date: '2026-11-01' },
    });
  });

  it('throws when the RPC returns an error', async () => {
    const rpcError = { message: 'template not found: tpl-missing' };
    mockRpc.mockResolvedValueOnce({ data: null, error: rpcError });

    const { result } = renderHook(() => useFeeTemplates());

    await expect(
      act(async () => {
        await result.current.updateTemplate('tpl-missing', { total_amount: 999 });
      }),
    ).rejects.toMatchObject({ message: 'template not found: tpl-missing' });
  });
});

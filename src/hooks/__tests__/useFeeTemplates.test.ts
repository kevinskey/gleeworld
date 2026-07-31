// @vitest-environment jsdom
/**
 * Unit tests for useFeeTemplates.
 *
 * Strategy: mock @/integrations/supabase/client and use renderHook (jsdom
 * environment) to assert the exact arguments the hook passes to supabase
 * (table names, insert shapes, filter chains) without a live DB.
 *
 * DB round-trip / RLS correctness is deferred to Task 17 (Playwright E2E).
 *
 * Skipped (deferred to E2E Task 17):
 *   - "creates template and verifies row persisted with correct tenant_id" — needs live DB
 *   - "lists templates filtered by category returns only matching rows" — filter
 *     argument verification below covers the call shape; row-level result
 *     depends on DB seeding.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { FeeTemplate } from '../useFeeTemplates';

// ── Supabase fluent-chain builder ─────────────────────────────────────────────
// Returns a Proxy where every chainable method records its arguments and
// returns `this`, and `await` resolves via a thenable.

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

// ── Module mock ───────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: () => mockGetUser() },
  },
}));

// Import hook AFTER mock registration so vi.mock hoisting applies.
import { useFeeTemplates } from '../useFeeTemplates';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FAKE_USER = { id: 'user-123' };

const fakeTpl = {
  id: 'tpl-1',
  tenant_id: 'tenant-abc',
  category: 'trip',
  name: '2026 Rome Tour Deposit',
  description: null,
  total_amount: 2000,
  currency: 'USD',
  due_date: '2026-09-01',
  allow_self_serve_split: false,
  context_type: null,
  context_id: null,
  created_by: FAKE_USER.id,
  created_at: '2026-07-30T00:00:00Z',
  updated_at: '2026-07-30T00:00:00Z',
  archived_at: null,
};

const fakeInstallments = [
  { id: 'ins-1', template_id: 'tpl-1', sequence: 1, amount: 500, due_date: '2026-09-01' },
  { id: 'ins-2', template_id: 'tpl-1', sequence: 2, amount: 500, due_date: '2026-11-01' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: FAKE_USER }, error: null });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useFeeTemplates', () => {

  // ── createTemplate ──────────────────────────────────────────────────────────

  describe('createTemplate', () => {
    it('calls supabase.from("gw_fee_templates") then "gw_fee_template_installments"', async () => {
      const tplChain = makeChain({ data: fakeTpl, error: null });
      const insChain = makeChain({ data: fakeInstallments, error: null });
      mockFrom
        .mockReturnValueOnce(tplChain)
        .mockReturnValueOnce(insChain);

      const { result } = renderHook(() => useFeeTemplates());

      let created!: FeeTemplate;
      await act(async () => {
        created = await result.current.createTemplate({
          category: 'trip',
          name: '2026 Rome Tour Deposit',
          total_amount: 2000,
          due_date: '2026-09-01',
          allow_self_serve_split: false,
          installments: [
            { sequence: 1, amount: 500, due_date: '2026-09-01' },
            { sequence: 2, amount: 500, due_date: '2026-11-01' },
          ],
        });
      });

      expect(mockFrom).toHaveBeenNthCalledWith(1, 'gw_fee_templates');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'gw_fee_template_installments');

      expect(created.name).toBe('2026 Rome Tour Deposit');
      expect(created.installments).toHaveLength(2);
      expect(created.installments[0].amount).toBe(500);
    });

    it('passes correct insert shape including created_by user id', async () => {
      const tplChain = makeChain({ data: fakeTpl, error: null });
      mockFrom.mockReturnValueOnce(tplChain);

      const { result } = renderHook(() => useFeeTemplates());

      await act(async () => {
        await result.current.createTemplate({
          category: 'dues',
          name: 'Annual Dues',
          total_amount: 150,
        });
      });

      const insertArgs = (tplChain._calls['insert'] ?? [])[0]?.[0] as Record<string, unknown>;
      expect(insertArgs).toBeDefined();
      expect(insertArgs.category).toBe('dues');
      expect(insertArgs.name).toBe('Annual Dues');
      expect(insertArgs.total_amount).toBe(150);
      expect(insertArgs.created_by).toBe(FAKE_USER.id);
      expect(insertArgs.description).toBeNull();
      expect(insertArgs.allow_self_serve_split).toBe(true);
    });

    it('skips gw_fee_template_installments call when no installments provided', async () => {
      const tplChain = makeChain({ data: fakeTpl, error: null });
      mockFrom.mockReturnValueOnce(tplChain);

      const { result } = renderHook(() => useFeeTemplates());

      await act(async () => {
        await result.current.createTemplate({ category: 'dues', name: 'Dues', total_amount: 50 });
      });

      const installmentsCalls = mockFrom.mock.calls.filter(
        (c: unknown[]) => c[0] === 'gw_fee_template_installments',
      );
      expect(installmentsCalls).toHaveLength(0);
    });

    it('throws when getUser returns null (not authenticated)', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const { result } = renderHook(() => useFeeTemplates());

      await expect(
        act(async () => {
          await result.current.createTemplate({ category: 'trip', name: 'T', total_amount: 1 });
        }),
      ).rejects.toThrow('Not authenticated');
    });
  });

  // ── listTemplates ───────────────────────────────────────────────────────────

  describe('listTemplates', () => {
    it('calls supabase.from("gw_fee_templates") and selects installments relation', async () => {
      const listChain = makeChain({ data: [], error: null });
      mockFrom.mockReturnValueOnce(listChain);

      const { result } = renderHook(() => useFeeTemplates());

      await act(async () => {
        await result.current.listTemplates();
      });

      expect(mockFrom).toHaveBeenCalledWith('gw_fee_templates');
      const selectArg = (listChain._calls['select'] ?? [])[0]?.[0] as string;
      expect(selectArg).toContain('gw_fee_template_installments');
    });

    it('applies eq("category", ...) when category filter is provided', async () => {
      const listChain = makeChain({ data: [], error: null });
      mockFrom.mockReturnValueOnce(listChain);

      const { result } = renderHook(() => useFeeTemplates());

      await act(async () => {
        await result.current.listTemplates({ category: 'trip' });
      });

      const eqCalls = (listChain._calls['eq'] ?? []) as unknown[][];
      const categoryEq = eqCalls.find((c) => c[0] === 'category');
      expect(categoryEq).toBeDefined();
      expect(categoryEq![1]).toBe('trip');
    });

    it('applies is("archived_at", null) by default to exclude archived templates', async () => {
      const listChain = makeChain({ data: [], error: null });
      mockFrom.mockReturnValueOnce(listChain);

      const { result } = renderHook(() => useFeeTemplates());

      await act(async () => {
        await result.current.listTemplates();
      });

      const isCalls = (listChain._calls['is'] ?? []) as unknown[][];
      const archivedFilter = isCalls.find((c) => c[0] === 'archived_at');
      expect(archivedFilter).toBeDefined();
      expect(archivedFilter![1]).toBeNull();
    });

    it('omits the archived_at filter when includeArchived is true', async () => {
      const listChain = makeChain({ data: [], error: null });
      mockFrom.mockReturnValueOnce(listChain);

      const { result } = renderHook(() => useFeeTemplates());

      await act(async () => {
        await result.current.listTemplates({ includeArchived: true });
      });

      const isCalls = (listChain._calls['is'] ?? []) as unknown[][];
      const archivedFilter = isCalls.find((c) => c[0] === 'archived_at');
      expect(archivedFilter).toBeUndefined();
    });

    it('returns empty array when supabase responds with null data', async () => {
      const listChain = makeChain({ data: null, error: null });
      mockFrom.mockReturnValueOnce(listChain);

      const { result } = renderHook(() => useFeeTemplates());

      let templates!: FeeTemplate[];
      await act(async () => {
        templates = await result.current.listTemplates();
      });

      expect(templates).toEqual([]);
    });
  });

  // ── archiveTemplate ─────────────────────────────────────────────────────────

  describe('archiveTemplate', () => {
    it('calls update on gw_fee_templates with ISO archived_at and eq id filter', async () => {
      const archiveChain = makeChain({ data: null, error: null });
      mockFrom.mockReturnValueOnce(archiveChain);

      const { result } = renderHook(() => useFeeTemplates());

      await act(async () => {
        await result.current.archiveTemplate('tpl-999');
      });

      expect(mockFrom).toHaveBeenCalledWith('gw_fee_templates');

      const updateArgs = (archiveChain._calls['update'] ?? [])[0]?.[0] as Record<string, unknown>;
      expect(updateArgs).toBeDefined();
      expect(typeof updateArgs.archived_at).toBe('string');
      expect(new Date(updateArgs.archived_at as string).toISOString()).toBe(updateArgs.archived_at);

      const eqCalls = (archiveChain._calls['eq'] ?? []) as unknown[][];
      const idEq = eqCalls.find((c) => c[0] === 'id');
      expect(idEq![1]).toBe('tpl-999');
    });
  });

  // ── updateTemplate ──────────────────────────────────────────────────────────

  describe('updateTemplate', () => {
    it('updates gw_fee_templates then fetches installments for the returned FeeTemplate', async () => {
      const updatedTpl = { ...fakeTpl, name: 'Renamed' };
      const updateChain = makeChain({ data: updatedTpl, error: null });
      const instChain = makeChain({ data: fakeInstallments, error: null });
      mockFrom
        .mockReturnValueOnce(updateChain)
        .mockReturnValueOnce(instChain);

      const { result } = renderHook(() => useFeeTemplates());

      let updated!: FeeTemplate;
      await act(async () => {
        updated = await result.current.updateTemplate('tpl-1', { name: 'Renamed' });
      });

      expect(mockFrom).toHaveBeenNthCalledWith(1, 'gw_fee_templates');
      expect(mockFrom).toHaveBeenNthCalledWith(2, 'gw_fee_template_installments');

      const updateArgs = (updateChain._calls['update'] ?? [])[0]?.[0] as Record<string, unknown>;
      expect(updateArgs.name).toBe('Renamed');

      expect(updated.installments).toHaveLength(2);
    });
  });
});

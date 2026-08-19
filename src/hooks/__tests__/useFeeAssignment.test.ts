// @vitest-environment jsdom
/**
 * Unit tests for useFeeAssignment.
 *
 * Strategy: mock @/integrations/supabase/client and assert the hook calls
 * supabase.rpc('assign_fee_template', { p_template_id, p_user_ids }) and
 * returns the integer count from the RPC response.
 *
 * DB round-trip / RLS correctness is deferred to Task 17 (Playwright E2E).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Module mock ───────────────────────────────────────────────────────────────

const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Import hook AFTER mock registration so vi.mock hoisting applies.
import { useFeeAssignment } from '../useFeeAssignment';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEMPLATE_ID = 'tpl-abc-123';
const USER_IDS = ['user-1', 'user-2', 'user-3'];

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useFeeAssignment', () => {

  describe('assign', () => {
    it('calls rpc with correct name and args', async () => {
      mockRpc.mockResolvedValueOnce({ data: 3, error: null });

      const { result } = renderHook(() => useFeeAssignment());

      await act(async () => {
        await result.current.assign(TEMPLATE_ID, USER_IDS);
      });

      expect(mockRpc).toHaveBeenCalledOnce();
      expect(mockRpc).toHaveBeenCalledWith('assign_fee_template', {
        p_template_id: TEMPLATE_ID,
        p_user_ids: USER_IDS,
      });
    });

    it('returns the count from the RPC response', async () => {
      mockRpc.mockResolvedValueOnce({ data: 3, error: null });

      const { result } = renderHook(() => useFeeAssignment());

      let count = 0;
      await act(async () => {
        count = await result.current.assign(TEMPLATE_ID, USER_IDS);
      });

      expect(count).toBe(3);
    });

    it('returns 0 when RPC returns null data (all users already assigned)', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useFeeAssignment());

      let count = -1;
      await act(async () => {
        count = await result.current.assign(TEMPLATE_ID, USER_IDS);
      });

      expect(count).toBe(0);
    });

    it('returns 0 when RPC returns 0 (idempotent re-assign)', async () => {
      mockRpc.mockResolvedValueOnce({ data: 0, error: null });

      const { result } = renderHook(() => useFeeAssignment());

      let count = -1;
      await act(async () => {
        count = await result.current.assign(TEMPLATE_ID, USER_IDS);
      });

      expect(count).toBe(0);
    });

    it('throws when RPC returns an error', async () => {
      const rpcError = { message: 'template not found' };
      mockRpc.mockResolvedValueOnce({ data: null, error: rpcError });

      const { result } = renderHook(() => useFeeAssignment());

      await expect(
        act(async () => {
          await result.current.assign('nonexistent-tpl', USER_IDS);
        }),
      ).rejects.toMatchObject({ message: 'template not found' });
    });

    it('passes an empty user array without error and returns 0', async () => {
      mockRpc.mockResolvedValueOnce({ data: 0, error: null });

      const { result } = renderHook(() => useFeeAssignment());

      let count = -1;
      await act(async () => {
        count = await result.current.assign(TEMPLATE_ID, []);
      });

      expect(count).toBe(0);
      expect(mockRpc).toHaveBeenCalledWith('assign_fee_template', {
        p_template_id: TEMPLATE_ID,
        p_user_ids: [],
      });
    });
  });
});

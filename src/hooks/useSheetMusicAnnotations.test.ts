// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const calls: Array<{ table: string; op: string; args: unknown }> = [];
const rpcMock = vi.fn(async (..._args: unknown[]) => ({ data: null, error: null }));

function chain(table: string) {
  const self: any = {
    select: vi.fn(() => self),
    insert: vi.fn((payload: unknown) => {
      calls.push({ table, op: 'insert', args: payload });
      return Promise.resolve({ error: null });
    }),
    eq: vi.fn((col: string, val: unknown) => {
      calls.push({ table, op: `eq:${col}`, args: val });
      return self;
    }),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
  };
  return self;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn((t: string) => chain(t)), rpc: (...a: unknown[]) => rpcMock(...a) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useSheetMusicAnnotations } from './useSheetMusicAnnotations';

beforeEach(() => { calls.length = 0; rpcMock.mockClear(); });

describe('useSheetMusicAnnotations personal routing', () => {
  it('fetches personal annotations from gw_personal_score_annotations with the bare uuid', async () => {
    const { result } = renderHook(() => useSheetMusicAnnotations('personal:abc-123'));
    await act(() => result.current.fetchAnnotations('personal:abc-123'));
    expect(calls).toContainEqual({ table: 'gw_personal_score_annotations', op: 'eq:personal_score_id', args: 'abc-123' });
    expect(calls.some((c) => c.table === 'gw_sheet_music_annotations')).toBe(false);
  });

  it('fetches tenant annotations from gw_sheet_music_annotations unchanged', async () => {
    const { result } = renderHook(() => useSheetMusicAnnotations('score-9'));
    await act(() => result.current.fetchAnnotations('score-9'));
    expect(calls).toContainEqual({ table: 'gw_sheet_music_annotations', op: 'eq:sheet_music_id', args: 'score-9' });
  });

  it('saves personal annotations without layer id and without the analytics RPC', async () => {
    const { result } = renderHook(() => useSheetMusicAnnotations('personal:abc-123'));
    await act(async () => {
      await result.current.saveAnnotation('personal:abc-123', 2, 'drawing', { paths: [] }, { x: 0, y: 0 }, 'layer-7');
    });
    const ins = calls.find((c) => c.op === 'insert');
    expect(ins?.table).toBe('gw_personal_score_annotations');
    expect(ins?.args).toMatchObject({ personal_score_id: 'abc-123', user_id: 'user-1', page_number: 2 });
    expect((ins?.args as Record<string, unknown>)).not.toHaveProperty('annotation_layer_id');
    expect((ins?.args as Record<string, unknown>)).not.toHaveProperty('sheet_music_id');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('saves tenant annotations with layer id and fires the analytics RPC', async () => {
    const { result } = renderHook(() => useSheetMusicAnnotations('score-9'));
    await act(async () => {
      await result.current.saveAnnotation('score-9', 1, 'drawing', {}, { x: 0, y: 0 }, 'layer-7');
    });
    const ins = calls.find((c) => c.op === 'insert');
    expect(ins?.table).toBe('gw_sheet_music_annotations');
    expect(ins?.args).toMatchObject({ sheet_music_id: 'score-9', annotation_layer_id: 'layer-7' });
    expect(rpcMock).toHaveBeenCalledOnce();
  });
});

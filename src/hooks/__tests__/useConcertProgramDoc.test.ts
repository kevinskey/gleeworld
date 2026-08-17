// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Hoisted mocks (vi.mock factories run before imports, so any mock refs
// referenced inside them must be created via vi.hoisted). ─────────────────

const {
  fromMock,
  programsUpdateMock, programsUpdateEqMock, programsUpdateSelectMock,
  piecesInsertMock, piecesInsertSelectMock, piecesInsertSingleMock,
  piecesUpdateMock, piecesUpdateEqMock, piecesUpdateSelectMock,
  piecesDeleteMock, piecesDeleteEqMock, piecesDeleteSelectMock,
} = vi.hoisted(() => {
  const programsUpdateSelectMock = vi.fn();
  const programsUpdateEqMock = vi.fn((_col: string, _val: string) => ({ select: programsUpdateSelectMock }));
  const programsUpdateMock = vi.fn((_payload: Record<string, unknown>) => ({ eq: programsUpdateEqMock }));

  const piecesInsertSingleMock = vi.fn();
  const piecesInsertSelectMock = vi.fn((_cols: string) => ({ single: piecesInsertSingleMock }));
  const piecesInsertMock = vi.fn((_payload: Record<string, unknown>) => ({ select: piecesInsertSelectMock }));

  const piecesUpdateSelectMock = vi.fn();
  const piecesUpdateEqMock = vi.fn((_col: string, _val: string) => ({ select: piecesUpdateSelectMock }));
  const piecesUpdateMock = vi.fn((_payload: Record<string, unknown>) => ({ eq: piecesUpdateEqMock }));

  const piecesDeleteSelectMock = vi.fn();
  const piecesDeleteEqMock = vi.fn((_col: string, _val: string) => ({ select: piecesDeleteSelectMock }));
  const piecesDeleteMock = vi.fn(() => ({ eq: piecesDeleteEqMock }));

  const fromMock = vi.fn((table: string) => {
    if (table === 'gw_concert_programs') return { update: programsUpdateMock };
    if (table === 'gw_concert_program_pieces') {
      return { insert: piecesInsertMock, update: piecesUpdateMock, delete: piecesDeleteMock };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return {
    fromMock,
    programsUpdateMock, programsUpdateEqMock, programsUpdateSelectMock,
    piecesInsertMock, piecesInsertSelectMock, piecesInsertSingleMock,
    piecesUpdateMock, piecesUpdateEqMock, piecesUpdateSelectMock,
    piecesDeleteMock, piecesDeleteEqMock, piecesDeleteSelectMock,
  };
});

const { toastMock } = vi.hoisted(() => {
  const toastMock = Object.assign(vi.fn(), { error: vi.fn() });
  return { toastMock };
});

const { legacyMock } = vi.hoisted(() => ({ legacyMock: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock },
}));

vi.mock('sonner', () => ({ toast: toastMock }));

vi.mock('@/hooks/useConcertPrograms', () => ({
  useConcertProgram: (id: string | undefined) => legacyMock(id),
}));

import { useConcertProgramDoc } from '../useConcertProgramDoc';
import type { ProgramBlock } from '@/lib/concertProgram/types';

// ── Fixtures ───────────────────────────────────────────────────────────

const pieceA = {
  id: 'piece-a', program_id: 'prog-1', sort_order: 0, section_heading: null,
  title: 'Ave Maria', composer: 'Biebl', arranger: null, voicing: null,
  soloists: null, duration_seconds: null, program_notes: null,
  sheet_music_id: null, rights_status: null, copyright_info: null,
};
const pieceB = {
  id: 'piece-b', program_id: 'prog-1', sort_order: 1, section_heading: null,
  title: 'Set Me as a Seal', composer: 'Walker', arranger: null, voicing: null,
  soloists: null, duration_seconds: null, program_notes: null,
  sheet_music_id: null, rights_status: null, copyright_info: null,
};
const pieceC = {
  id: 'piece-c', program_id: 'prog-1', sort_order: 2, section_heading: null,
  title: 'Locus Iste', composer: 'Bruckner', arranger: null, voicing: null,
  soloists: null, duration_seconds: null, program_notes: null,
  sheet_music_id: null, rights_status: null, copyright_info: null,
};

function makeProgram(blocks: ProgramBlock[], notes: string | null = null) {
  return {
    id: 'prog-1', title: 'Spring Concert', subtitle: null, event_date: null,
    call_time: null, venue: null, conductor: null, accompanist: null,
    performer_group: null, cover_image_url: null, notes,
    target_length_minutes: null, template_kind: 'choral', theme: 'default',
    print_format: 'letter', card_layout: 'default', print_design: 'classic-1943',
    blocks, design_state: {}, canva_design_id: null, setlist_id: null,
    published_at: null, published_by: null, published_slug: null,
    created_at: '2026-01-01', updated_at: '2026-01-01',
  };
}

function legacyReturn(overrides: Record<string, unknown> = {}) {
  return {
    program: makeProgram([]),
    pieces: [] as unknown[],
    roster: [] as unknown[],
    isLoading: false,
    updateProgram: { mutate: vi.fn() },
    addPiece: { mutate: vi.fn() },
    updatePiece: { mutate: vi.fn() },
    deletePiece: { mutate: vi.fn() },
    reorderPieces: { mutate: vi.fn() },
    addRosterSection: { mutate: vi.fn() },
    updateRosterSection: { mutate: vi.fn() },
    deleteRosterSection: { mutate: vi.fn() },
    addRosterMember: { mutate: vi.fn() },
    deleteRosterMember: { mutate: vi.fn() },
    ...overrides,
  };
}

function renderDoc() {
  const qc = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return renderHook(() => useConcertProgramDoc('prog-1'), { wrapper });
}

beforeEach(() => {
  fromMock.mockClear();
  programsUpdateMock.mockClear();
  programsUpdateEqMock.mockClear();
  programsUpdateSelectMock.mockReset();
  piecesInsertMock.mockClear();
  piecesInsertSelectMock.mockClear();
  piecesInsertSingleMock.mockReset();
  piecesUpdateMock.mockClear();
  piecesUpdateEqMock.mockClear();
  piecesUpdateSelectMock.mockReset();
  piecesDeleteMock.mockClear();
  piecesDeleteEqMock.mockClear();
  piecesDeleteSelectMock.mockReset();
  toastMock.mockClear();
  toastMock.error.mockClear();
  legacyMock.mockReset();

  // Sane defaults — success on every write.
  programsUpdateSelectMock.mockResolvedValue({ data: [{ id: 'prog-1' }], error: null });
  piecesInsertSingleMock.mockResolvedValue({ data: { id: 'new-piece-id' }, error: null });
  piecesUpdateSelectMock.mockResolvedValue({ data: [{ id: 'x' }], error: null });
  piecesDeleteSelectMock.mockResolvedValue({ data: [{ id: 'x' }], error: null });
});

describe('useConcertProgramDoc', () => {
  it('reconciles blocks: drops a dangling piece id and adopts an orphaned piece', async () => {
    const blocks: ProgramBlock[] = [
      { id: 'grp1', kind: 'piece-group', sectionHeading: null, pieceIds: ['piece-a', 'dangling-id'], creditLine: null },
    ];
    legacyMock.mockReturnValue(legacyReturn({
      program: makeProgram(blocks),
      pieces: [pieceA, pieceB],
    }));

    const { result } = renderDoc();

    await waitFor(() => {
      expect(result.current.blocks).not.toBeNull();
    });

    const group = result.current.blocks!.find((b) => b.id === 'grp1') as Extract<ProgramBlock, { kind: 'piece-group' }>;
    expect(group.pieceIds).not.toContain('dangling-id');
    expect(group.pieceIds).toContain('piece-a');
    expect(group.pieceIds).toContain('piece-b'); // orphan adopted
  });

  it('addPieceToGroup inserts the row BEFORE patching blocks, and splices the new id at the right index', async () => {
    const blocks: ProgramBlock[] = [
      { id: 'grp1', kind: 'piece-group', sectionHeading: null, pieceIds: ['piece-a'], creditLine: null },
    ];
    legacyMock.mockReturnValue(legacyReturn({
      program: makeProgram(blocks),
      pieces: [pieceA],
    }));
    piecesInsertSingleMock.mockResolvedValue({ data: { id: 'piece-new' }, error: null });

    const { result } = renderDoc();
    await waitFor(() => expect(result.current.blocks).not.toBeNull());

    let newId: string | null = null;
    await act(async () => {
      newId = await result.current.addPieceToGroup('grp1', 0, { title: 'New Piece' });
    });

    expect(newId).toBe('piece-new');
    expect(piecesInsertMock.mock.invocationCallOrder[0]).toBeLessThan(programsUpdateMock.mock.invocationCallOrder[0]);

    const group = result.current.blocks!.find((b) => b.id === 'grp1') as Extract<ProgramBlock, { kind: 'piece-group' }>;
    expect(group.pieceIds).toEqual(['piece-new', 'piece-a']);
  });

  it('addPieceToGroup rolls back (deletes the orphan row) when the blocks update fails', async () => {
    const blocks: ProgramBlock[] = [
      { id: 'grp1', kind: 'piece-group', sectionHeading: null, pieceIds: [], creditLine: null },
    ];
    legacyMock.mockReturnValue(legacyReturn({
      program: makeProgram(blocks),
      pieces: [],
    }));
    piecesInsertSingleMock.mockResolvedValue({ data: { id: 'orphan-1' }, error: null });
    programsUpdateSelectMock.mockResolvedValue({ data: [], error: null }); // failure

    const { result } = renderDoc();
    await waitFor(() => expect(result.current.blocks).not.toBeNull());

    let newId: string | null = 'unset';
    await act(async () => {
      newId = await result.current.addPieceToGroup('grp1', 'end', {});
    });

    expect(newId).toBeNull();
    expect(piecesDeleteEqMock).toHaveBeenCalledWith('id', 'orphan-1');
  });

  it('persistBlocksNow mirrors sort_order only for pieces whose position changed', async () => {
    const blocks: ProgramBlock[] = [
      { id: 'grp1', kind: 'piece-group', sectionHeading: null, pieceIds: ['piece-a', 'piece-b'], creditLine: null },
    ];
    legacyMock.mockReturnValue(legacyReturn({
      program: makeProgram(blocks),
      pieces: [pieceA, pieceB], // a: sort_order 0, b: sort_order 1
    }));

    const { result } = renderDoc();
    await waitFor(() => expect(result.current.blocks).not.toBeNull());

    const reordered: ProgramBlock[] = [
      { id: 'grp1', kind: 'piece-group', sectionHeading: null, pieceIds: ['piece-b', 'piece-a'], creditLine: null },
    ];

    let ok = false;
    await act(async () => {
      ok = await result.current.persistBlocksNow(reordered);
    });

    expect(ok).toBe(true);
    expect(piecesUpdateMock).toHaveBeenCalledTimes(2);
    expect(piecesUpdateMock.mock.calls[0][0]).toEqual({ sort_order: 0 });
    expect(piecesUpdateEqMock.mock.calls[0]).toEqual(['id', 'piece-b']);
    expect(piecesUpdateMock.mock.calls[1][0]).toEqual({ sort_order: 1 });
    expect(piecesUpdateEqMock.mock.calls[1]).toEqual(['id', 'piece-a']);
  });

  it('deletePieceWithUndo fires a toast with an Undo action that re-inserts the piece', async () => {
    const blocks: ProgramBlock[] = [
      { id: 'grp1', kind: 'piece-group', sectionHeading: null, pieceIds: ['piece-a', 'piece-b'], creditLine: null },
    ];
    legacyMock.mockReturnValue(legacyReturn({
      program: makeProgram(blocks),
      pieces: [pieceA, pieceB],
    }));
    piecesInsertSingleMock.mockResolvedValue({ data: { id: 'restored-a' }, error: null });

    const { result } = renderDoc();
    await waitFor(() => expect(result.current.blocks).not.toBeNull());

    await act(async () => {
      await result.current.deletePieceWithUndo('piece-a');
    });

    expect(piecesDeleteEqMock).toHaveBeenCalledWith('id', 'piece-a');
    expect(toastMock).toHaveBeenCalledTimes(1);
    const [message, opts] = toastMock.mock.calls[0];
    expect(message).toContain('Ave Maria');
    expect(opts.action.label).toBe('Undo');

    piecesInsertMock.mockClear();
    await act(async () => {
      await opts.action.onClick();
    });

    expect(piecesInsertMock).toHaveBeenCalledTimes(1);
    const insertPayload = piecesInsertMock.mock.calls[0][0];
    expect(insertPayload.title).toBe('Ave Maria');
    expect(insertPayload.id).toBeUndefined();
  });

  it('persistBlocksNow does not rewrite sort_order for a piece that keeps its position', async () => {
    const blocks: ProgramBlock[] = [
      { id: 'grp1', kind: 'piece-group', sectionHeading: null, pieceIds: ['piece-a', 'piece-b', 'piece-c'], creditLine: null },
    ];
    legacyMock.mockReturnValue(legacyReturn({
      program: makeProgram(blocks),
      pieces: [pieceA, pieceB, pieceC], // a:0, b:1, c:2
    }));

    const { result } = renderDoc();
    await waitFor(() => expect(result.current.blocks).not.toBeNull());

    // Swap a/b, leave c exactly where it was (still index 2 → sort_order 2).
    const reordered: ProgramBlock[] = [
      { id: 'grp1', kind: 'piece-group', sectionHeading: null, pieceIds: ['piece-b', 'piece-a', 'piece-c'], creditLine: null },
    ];

    await act(async () => {
      await result.current.persistBlocksNow(reordered);
    });

    expect(piecesUpdateMock).toHaveBeenCalledTimes(2);
    expect(piecesUpdateEqMock.mock.calls.map((c) => c[1])).toEqual(['piece-b', 'piece-a']);
    expect(piecesUpdateEqMock.mock.calls.map((c) => c[1])).not.toContain('piece-c');
  });

  it('deletePieceWithUndo treats an RLS-silenced delete (empty data, no error) as a failure', async () => {
    const blocks: ProgramBlock[] = [
      { id: 'grp1', kind: 'piece-group', sectionHeading: null, pieceIds: ['piece-a', 'piece-b'], creditLine: null },
    ];
    legacyMock.mockReturnValue(legacyReturn({
      program: makeProgram(blocks),
      pieces: [pieceA, pieceB],
    }));
    piecesDeleteSelectMock.mockResolvedValueOnce({ data: [], error: null }); // silently rejected

    const { result } = renderDoc();
    await waitFor(() => expect(result.current.blocks).not.toBeNull());

    await act(async () => {
      await result.current.deletePieceWithUndo('piece-a');
    });

    expect(toastMock.error).toHaveBeenCalledWith('Could not remove the piece');
    expect(toastMock).not.toHaveBeenCalled(); // no Undo toast — nothing was actually removed
    expect(programsUpdateMock).not.toHaveBeenCalled(); // blocks must not be touched

    const group = result.current.blocks!.find((b) => b.id === 'grp1') as Extract<ProgramBlock, { kind: 'piece-group' }>;
    expect(group.pieceIds).toContain('piece-a'); // still there
  });

  it('deleteBlockWithUndo (piece-group) still offers Undo when some but not all piece deletes fail', async () => {
    const blocks: ProgramBlock[] = [
      { id: 'grp1', kind: 'piece-group', sectionHeading: null, pieceIds: ['piece-a', 'piece-b'], creditLine: null },
    ];
    legacyMock.mockReturnValue(legacyReturn({
      program: makeProgram(blocks),
      pieces: [pieceA, pieceB],
    }));
    // piece-a's delete succeeds, piece-b's is RLS-silenced (empty data).
    piecesDeleteSelectMock
      .mockResolvedValueOnce({ data: [{ id: 'piece-a' }], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderDoc();
    await waitFor(() => expect(result.current.blocks).not.toBeNull());

    await act(async () => {
      await result.current.deleteBlockWithUndo('grp1');
    });

    // Partial failure still reported...
    expect(toastMock.error).toHaveBeenCalledWith('Could not remove the section');
    // ...but the row that DID get deleted still gets an Undo offer.
    expect(toastMock).toHaveBeenCalledTimes(1);
    const [, opts] = toastMock.mock.calls[0];
    expect(opts.action.label).toBe('Undo');

    // The group survives (piece-b's row is still really there), pruned to
    // just the surviving piece.
    const group = result.current.blocks!.find((b) => b.id === 'grp1') as Extract<ProgramBlock, { kind: 'piece-group' }>;
    expect(group.pieceIds).toEqual(['piece-b']);
  });

  it('Undo restores into the CURRENT blocks, not a stale delete-time snapshot', async () => {
    const blocks: ProgramBlock[] = [
      { id: 'grp1', kind: 'piece-group', sectionHeading: null, pieceIds: ['piece-a', 'piece-b'], creditLine: null },
    ];
    legacyMock.mockReturnValue(legacyReturn({
      program: makeProgram(blocks),
      pieces: [pieceA, pieceB],
    }));
    piecesInsertSingleMock.mockResolvedValue({ data: { id: 'restored-a' }, error: null });

    const { result } = renderDoc();
    await waitFor(() => expect(result.current.blocks).not.toBeNull());

    await act(async () => {
      await result.current.deletePieceWithUndo('piece-a');
    });
    const [, opts] = toastMock.mock.calls[0];

    // An edit lands between the delete and the Undo click. Uses
    // persistBlocksNow (not setBlocks) so the test doesn't leave a real
    // 700ms debounce timer pending past the test's lifetime.
    const editBlock: ProgramBlock = { id: 'note-1', kind: 'text', text: 'Program note added mid-flight', align: 'center' };
    await act(async () => {
      await result.current.persistBlocksNow([...result.current.blocks!, editBlock]);
    });
    expect(result.current.blocks!.some((b) => b.id === 'note-1')).toBe(true);

    await act(async () => {
      await opts.action.onClick();
    });

    // The interim edit survived the Undo restore...
    expect(result.current.blocks!.some((b) => b.id === 'note-1')).toBe(true);
    // ...and the restored piece landed back in its original group.
    const group = result.current.blocks!.find((b) => b.id === 'grp1') as Extract<ProgramBlock, { kind: 'piece-group' }>;
    expect(group.pieceIds).toEqual(['restored-a', 'piece-b']);
  });
});

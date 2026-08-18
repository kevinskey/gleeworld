// Document-level data hook for the Concert Program rebuild. Wraps
// useConcertProgram (header fields, pieces, roster CRUD) and adds the
// blocks-document layer: reconcile-on-load, a single writer for
// gw_concert_programs.blocks that mirrors gw_concert_program_pieces.sort_order,
// atomic piece-add (insert row before patching blocks; roll back on
// failure), and single-level undo for piece/block deletes.
// Spec: 2026-08-17-concert-program-rebuild-design.md.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useConcertProgram, type ConcertProgram, type ConcertProgramPiece } from '@/hooks/useConcertPrograms';
import type { RosterSection } from '@/lib/concertPlanner/types';
import { newBlockId, type PieceGroupBlock, type ProgramBlock } from '@/lib/concertProgram/types';
import { defaultNewProgramBlocks, deriveDefaultBlocks, flattenPieceOrder, reconcileBlocks } from '@/lib/concertProgram/blocks';

export interface ProgramDoc {
  program: ConcertProgram | null;
  pieces: ConcertProgramPiece[];
  roster: RosterSection[];
  isLoading: boolean;
  blocks: ProgramBlock[] | null;
  setBlocks(next: ProgramBlock[]): void;
  persistBlocksNow(next: ProgramBlock[]): Promise<boolean>;
  addPieceToGroup(groupId: string, index: number | 'end', fields?: Partial<ConcertProgramPiece>): Promise<string | null>;
  updatePiece(pieceId: string, patch: Partial<ConcertProgramPiece>): void;
  deletePieceWithUndo(pieceId: string): Promise<void>;
  deleteBlockWithUndo(blockId: string): Promise<void>;
  updateProgram: ReturnType<typeof useConcertProgram>['updateProgram'];
  rosterOps: Pick<ReturnType<typeof useConcertProgram>, 'addRosterSection' | 'updateRosterSection' | 'deleteRosterSection' | 'addRosterMember' | 'deleteRosterMember'>;
  legacyConcert: ReturnType<typeof useConcertProgram>;
}

const DEBOUNCE_MS = 700;

// ── Undo-restore helpers ─────────────────────────────────────────────────
// These read/write "current" blocks (at click time, via blocksRef), never a
// stale snapshot captured when the delete happened — an edit made between
// delete and Undo must survive the restore.

function clampInsertIndex(current: ProgramBlock[], desiredIndex: number): number {
  const footerIdx = current.findIndex((b) => b.kind === 'footer');
  const maxIdx = footerIdx === -1 ? current.length : footerIdx;
  return Math.min(desiredIndex, maxIdx);
}

function restorePieceIntoBlocks(
  current: ProgramBlock[],
  groupId: string | null,
  indexInGroup: number,
  newPieceId: string,
): ProgramBlock[] {
  if (groupId) {
    const idx = current.findIndex((b) => b.id === groupId && b.kind === 'piece-group');
    if (idx !== -1) {
      const g = current[idx] as PieceGroupBlock;
      const ids = g.pieceIds.slice();
      ids.splice(Math.min(indexInGroup, ids.length), 0, newPieceId);
      return current.map((b, i) => (i === idx ? { ...g, pieceIds: ids } : b));
    }
  }
  // Original group is gone — land in the last surviving group, or create one.
  const lastGroupIdx = current.map((b) => b.kind).lastIndexOf('piece-group');
  if (lastGroupIdx !== -1) {
    const g = current[lastGroupIdx] as PieceGroupBlock;
    return current.map((b, i) => (i === lastGroupIdx ? { ...g, pieceIds: [...g.pieceIds, newPieceId] } : b));
  }
  const newGroup: PieceGroupBlock = { id: newBlockId(), kind: 'piece-group', sectionHeading: null, pieceIds: [newPieceId], creditLine: null };
  const footerIdx = current.findIndex((b) => b.kind === 'footer');
  return footerIdx === -1 ? [...current, newGroup] : [...current.slice(0, footerIdx), newGroup, ...current.slice(footerIdx)];
}

export function useConcertProgramDoc(id: string | undefined): ProgramDoc {
  const legacyConcert = useConcertProgram(id);
  const {
    program, pieces, roster, isLoading, updateProgram, updatePiece: legacyUpdatePiece,
    addRosterSection, updateRosterSection, deleteRosterSection, addRosterMember, deleteRosterMember,
  } = legacyConcert;

  const qc = useQueryClient();

  const piecesById = useMemo(() => new Map(pieces.map((p) => [p.id, p])), [pieces]);

  const reconciled = useMemo(
    () => (program ? reconcileBlocks((program.blocks ?? []) as ProgramBlock[], pieces).blocks : null),
    [program, pieces],
  );

  const [localBlocks, setLocalBlocks] = useState<ProgramBlock[] | null>(null);
  const blocks = localBlocks ?? reconciled;

  // Always holds the latest rendered blocks, for Undo handlers to read at
  // click time rather than closing over a stale delete-time snapshot.
  const blocksRef = useRef<ProgramBlock[] | null>(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // Single writer for gw_concert_programs.blocks, but many independent call
  // sites race to be it: the doc hook's own first-open effect, the debounced
  // setBlocks, drag/reorder, undo, and (Task 14) the setlist auto-import
  // effect can all fire persistBlocksNow within the same render pass. Without
  // ordering, two in-flight UPDATEs can resolve out of call order and the
  // later-arriving response — not the later CALL — wins, silently clobbering
  // whichever write actually happened last. persistQueueRef chains every
  // write onto the tail of the previous one so the network section always
  // runs in strict call order, regardless of which resolves first. The
  // optimistic setLocalBlocks stays OUTSIDE the queue — the UI must update
  // immediately on every call, not wait its turn.
  const persistQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const persistBlocksNow = useCallback((next: ProgramBlock[]): Promise<boolean> => {
    if (!id) return Promise.resolve(false);
    setLocalBlocks(next); // optimistic — immediate, outside the write queue

    const run = async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('gw_concert_programs')
        .update({ blocks: next, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (error || !data?.length) {
        toast.error('Could not save the program layout');
        setLocalBlocks(null); // fall back to server state
        return false;
      }
      // Mirror: gw_concert_program_pieces.sort_order follows flattened block order.
      const order = flattenPieceOrder(next);
      const stale = order
        .map((pieceId, idx) => ({ pieceId, idx }))
        .filter(({ pieceId, idx }) => piecesById.get(pieceId)?.sort_order !== idx);
      const mirrorResults = await Promise.all(stale.map(({ pieceId, idx }) =>
        supabase.from('gw_concert_program_pieces').update({ sort_order: idx }).eq('id', pieceId).select('id'),
      ));
      // The blocks write is authoritative and already succeeded; a mirror
      // failure (e.g. RLS-silenced update) must surface, not revert it.
      if (mirrorResults.some((r: { error: unknown; data: unknown[] | null }) => r.error || !r.data?.length)) {
        toast.error('Could not save the running order');
      }
      qc.invalidateQueries({ queryKey: ['concert-program', id] });
      qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] });
      return true;
    };

    // Chain onto the queue regardless of whether the previous write
    // resolved or rejected, so one failure can never wedge every write
    // after it.
    const p = persistQueueRef.current.then(run, run);
    persistQueueRef.current = p;
    return p;
  }, [id, piecesById, qc]);

  const setBlocks = useCallback((next: ProgramBlock[]) => {
    setLocalBlocks(next); // optimistic
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persistBlocksNow(next);
    }, DEBOUNCE_MS);
  }, [persistBlocksNow]);

  // First-open persistence: derive default blocks once per program id, the
  // moment the program has loaded with an empty blocks column and the
  // pieces query has settled. The PUBLIC page derives in memory instead
  // (it cannot write), so this only runs for the authenticated editor.
  const firstOpenIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id || !program || isLoading) return;
    if ((program.blocks ?? []).length > 0) return;
    if (firstOpenIdRef.current === id) return;
    firstOpenIdRef.current = id;
    // Spec: a genuinely fresh program (no pieces, no notes, no roster
    // members yet) gets the plain new-program skeleton — title, empty
    // group, divider, footer — rather than deriveDefaultBlocks' inference,
    // which only has meaningful signal once there's real content to derive
    // from. Anything with existing pieces/notes/roster still derives.
    const isEmptyProgram = pieces.length === 0
      && !(program.notes && program.notes.trim())
      && !roster.some((s) => s.members.length > 0);
    void persistBlocksNow(
      isEmptyProgram ? defaultNewProgramBlocks() : deriveDefaultBlocks(program, pieces, roster),
    );
  }, [id, program, pieces, roster, isLoading, persistBlocksNow]);

  const addPieceToGroup = useCallback(async (
    groupId: string,
    index: number | 'end',
    fields: Partial<ConcertProgramPiece> = {},
  ): Promise<string | null> => {
    if (!id || !blocks) return null;
    const sortHint = flattenPieceOrder(blocks).length;
    const { data, error } = await supabase
      .from('gw_concert_program_pieces')
      .insert({ program_id: id, sort_order: sortHint, title: 'New piece', ...fields })
      .select('id')
      .single();
    if (error || !data) { toast.error('Could not add the piece'); return null; }
    const next = blocks.map((b) => {
      if (b.id !== groupId || b.kind !== 'piece-group') return b;
      const ids = b.pieceIds.slice();
      ids.splice(index === 'end' ? ids.length : index, 0, data.id);
      return { ...b, pieceIds: ids };
    });
    const ok = await persistBlocksNow(next);
    if (!ok) {
      // Roll back the orphan row rather than leave a half-state; reconcile
      // would re-adopt it visibly, but the spec wants no silent half-writes.
      const { data: delData, error: delError } = await supabase
        .from('gw_concert_program_pieces')
        .delete()
        .eq('id', data.id)
        .select('id');
      if (delError || !delData?.length) {
        console.warn(
          '[useConcertProgramDoc] rollback delete failed after a blocks-persist failure — orphan piece row survives; reconcile will re-adopt it visibly.',
          data.id, delError,
        );
      }
      toast.error('Could not add the piece');
      return null;
    }
    qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] });
    return data.id;
  }, [id, blocks, persistBlocksNow, qc]);

  const updatePieceFn = useCallback((pieceId: string, patch: Partial<ConcertProgramPiece>) => {
    legacyUpdatePiece.mutate({ pieceId, patch });
  }, [legacyUpdatePiece]);

  const deletePieceWithUndo = useCallback(async (pieceId: string) => {
    if (!blocks) return;
    const snapshotPiece = piecesById.get(pieceId);
    if (!snapshotPiece) return;
    const snapshotBlocks = blocks;

    // Where the piece lived, so Undo can put it back in the right spot even
    // if the group has since moved or been edited.
    let originalGroupId: string | null = null;
    let originalIndexInGroup = 0;
    for (const b of snapshotBlocks) {
      if (b.kind === 'piece-group') {
        const idx = b.pieceIds.indexOf(pieceId);
        if (idx !== -1) { originalGroupId = b.id; originalIndexInGroup = idx; break; }
      }
    }

    const { data, error } = await supabase
      .from('gw_concert_program_pieces')
      .delete()
      .eq('id', pieceId)
      .select('id');
    // A demo-tenant RLS-silenced delete returns {error: null, data: []} —
    // that's a failure, not a success; the row still exists.
    if (error || !data?.length) { toast.error('Could not remove the piece'); return; }

    const remainingPieces = pieces.filter((p) => p.id !== pieceId);
    const withoutPiece = snapshotBlocks.map((b) => (
      b.kind === 'piece-group' ? { ...b, pieceIds: b.pieceIds.filter((pid) => pid !== pieceId) } : b
    ));
    const { blocks: prunedBlocks } = reconcileBlocks(withoutPiece, remainingPieces);
    await persistBlocksNow(prunedBlocks);

    toast(`Removed "${snapshotPiece.title}"`, {
      action: {
        label: 'Undo',
        onClick: async () => {
          const { id: _oldId, ...content } = snapshotPiece;
          const { data: insertData, error: insertError } = await supabase
            .from('gw_concert_program_pieces')
            .insert(content)
            .select('id')
            .single();
          if (insertError || !insertData) { toast.error('Could not restore the piece'); return; }
          const current = blocksRef.current ?? [];
          const restored = restorePieceIntoBlocks(current, originalGroupId, originalIndexInGroup, insertData.id);
          await persistBlocksNow(restored);
          qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] });
        },
      },
    });
  }, [blocks, piecesById, pieces, persistBlocksNow, qc, id]);

  const deleteBlockWithUndo = useCallback(async (blockId: string) => {
    if (!blocks) return;
    const snapshotBlocks = blocks;
    const originalIndex = snapshotBlocks.findIndex((b) => b.id === blockId);
    if (originalIndex === -1) return;
    const block = snapshotBlocks[originalIndex];

    if (block.kind !== 'piece-group') {
      const next = snapshotBlocks.filter((b) => b.id !== blockId);
      const ok = await persistBlocksNow(next);
      if (!ok) return;
      toast('Removed block', {
        action: {
          label: 'Undo',
          onClick: async () => {
            const current = blocksRef.current ?? [];
            if (current.some((b) => b.id === blockId)) return; // already present
            const insertAt = clampInsertIndex(current, originalIndex);
            const restored = [...current.slice(0, insertAt), block, ...current.slice(insertAt)];
            await persistBlocksNow(restored);
          },
        },
      });
      return;
    }

    // piece-group: snapshot + delete its piece rows too. Each row's delete
    // is checked individually — an RLS-silenced delete (error: null,
    // data: []) must not be treated as success.
    const group = block;
    const groupPieces = group.pieceIds
      .map((pid) => piecesById.get(pid))
      .filter((p): p is ConcertProgramPiece => !!p);

    const deleteResults = await Promise.all(group.pieceIds.map(async (pid) => {
      const { data, error } = await supabase
        .from('gw_concert_program_pieces')
        .delete()
        .eq('id', pid)
        .select('id');
      return { pid, ok: !error && !!data?.length };
    }));
    const deletedIds = new Set(deleteResults.filter((r) => r.ok).map((r) => r.pid));

    if (deletedIds.size < deleteResults.length) {
      toast.error('Could not remove the section');
    }
    if (deletedIds.size === 0) {
      // Nothing actually changed in the DB — don't touch blocks, no Undo.
      return;
    }

    // At least one row is really gone. Reflect that in blocks regardless of
    // whether every row succeeded, and offer Undo for whatever was deleted.
    const remainingGroupPieceIds = group.pieceIds.filter((pid) => !deletedIds.has(pid));
    const groupFullyRemoved = remainingGroupPieceIds.length === 0;
    const remainingPieces = pieces.filter((p) => !deletedIds.has(p.id));
    const patchedBlocks = groupFullyRemoved
      ? snapshotBlocks.filter((b) => b.id !== blockId)
      : snapshotBlocks.map((b) => (b.id === blockId ? { ...b, pieceIds: remainingGroupPieceIds } : b));
    const { blocks: prunedBlocks } = reconcileBlocks(patchedBlocks, remainingPieces);
    // Rows are already gone from the DB; Undo must be offered regardless of
    // whether this metadata write itself succeeds.
    await persistBlocksNow(prunedBlocks);

    const restorableSnapshot = groupPieces.filter((p) => deletedIds.has(p.id));

    toast('Removed section', {
      action: {
        label: 'Undo',
        onClick: async () => {
          const inserted = await Promise.all(restorableSnapshot.map(async (p) => {
            const { id: _oldId, ...content } = p;
            const { data, error } = await supabase
              .from('gw_concert_program_pieces')
              .insert(content)
              .select('id')
              .single();
            return error || !data ? null : (data.id as string);
          }));
          const newIds = inserted.filter((x): x is string => !!x);
          if (newIds.length === 0) {
            toast.error('Could not restore the section');
            return;
          }

          const current = blocksRef.current ?? [];
          const stillPresent = current.some((b) => b.id === blockId && b.kind === 'piece-group');
          const restored: ProgramBlock[] = stillPresent
            ? current.map((b) => (
                b.id === blockId && b.kind === 'piece-group' ? { ...b, pieceIds: [...b.pieceIds, ...newIds] } : b
              ))
            : (() => {
                const insertAt = clampInsertIndex(current, originalIndex);
                const restoredGroup: PieceGroupBlock = { ...group, pieceIds: newIds };
                return [...current.slice(0, insertAt), restoredGroup, ...current.slice(insertAt)];
              })();
          await persistBlocksNow(restored);
          qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] });

          if (newIds.length < restorableSnapshot.length) {
            const failedCount = restorableSnapshot.length - newIds.length;
            toast.error(`Restored ${newIds.length} of ${restorableSnapshot.length} pieces — ${failedCount} could not be restored`);
          }
        },
      },
    });
  }, [blocks, piecesById, pieces, persistBlocksNow, qc, id]);

  const rosterOps = useMemo(() => ({
    addRosterSection, updateRosterSection, deleteRosterSection, addRosterMember, deleteRosterMember,
  }), [addRosterSection, updateRosterSection, deleteRosterSection, addRosterMember, deleteRosterMember]);

  return {
    program,
    pieces,
    roster,
    isLoading,
    blocks,
    setBlocks,
    persistBlocksNow,
    addPieceToGroup,
    updatePiece: updatePieceFn,
    deletePieceWithUndo,
    deleteBlockWithUndo,
    updateProgram,
    rosterOps,
    legacyConcert,
  };
}

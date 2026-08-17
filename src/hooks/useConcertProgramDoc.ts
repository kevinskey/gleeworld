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
import type { PieceGroupBlock, ProgramBlock } from '@/lib/concertProgram/types';
import { deriveDefaultBlocks, flattenPieceOrder, reconcileBlocks } from '@/lib/concertProgram/blocks';

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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const persistBlocksNow = useCallback(async (next: ProgramBlock[]): Promise<boolean> => {
    if (!id) return false;
    setLocalBlocks(next); // optimistic
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
    await Promise.all(stale.map(({ pieceId, idx }) =>
      supabase.from('gw_concert_program_pieces').update({ sort_order: idx }).eq('id', pieceId).select('id'),
    ));
    qc.invalidateQueries({ queryKey: ['concert-program', id] });
    qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] });
    return true;
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
    void persistBlocksNow(deriveDefaultBlocks(program, pieces, roster));
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
      await supabase.from('gw_concert_program_pieces').delete().eq('id', data.id).select('id');
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

    const { error } = await supabase
      .from('gw_concert_program_pieces')
      .delete()
      .eq('id', pieceId)
      .select('id');
    if (error) { toast.error('Could not remove the piece'); return; }

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
          const { data, error: insertError } = await supabase
            .from('gw_concert_program_pieces')
            .insert(content)
            .select('id')
            .single();
          if (insertError || !data) { toast.error('Could not restore the piece'); return; }
          const restoredBlocks = snapshotBlocks.map((b) => (
            b.kind === 'piece-group'
              ? { ...b, pieceIds: b.pieceIds.map((pid) => (pid === pieceId ? data.id : pid)) }
              : b
          ));
          await persistBlocksNow(restoredBlocks);
          qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] });
        },
      },
    });
  }, [blocks, piecesById, pieces, persistBlocksNow, qc, id]);

  const deleteBlockWithUndo = useCallback(async (blockId: string) => {
    if (!blocks) return;
    const snapshotBlocks = blocks;
    const block = snapshotBlocks.find((b) => b.id === blockId);
    if (!block) return;

    if (block.kind !== 'piece-group') {
      const next = snapshotBlocks.filter((b) => b.id !== blockId);
      const ok = await persistBlocksNow(next);
      if (!ok) return;
      toast('Removed block', {
        action: {
          label: 'Undo',
          onClick: async () => {
            await persistBlocksNow(snapshotBlocks);
          },
        },
      });
      return;
    }

    // piece-group: snapshot + delete its piece rows too.
    const group = block;
    const groupPieces = group.pieceIds
      .map((pid) => piecesById.get(pid))
      .filter((p): p is ConcertProgramPiece => !!p);

    await Promise.all(group.pieceIds.map((pid) =>
      supabase.from('gw_concert_program_pieces').delete().eq('id', pid).select('id'),
    ));

    const groupIdSet = new Set(group.pieceIds);
    const remainingPieces = pieces.filter((p) => !groupIdSet.has(p.id));
    const withoutGroup = snapshotBlocks.filter((b) => b.id !== blockId);
    const { blocks: prunedBlocks } = reconcileBlocks(withoutGroup, remainingPieces);
    const ok = await persistBlocksNow(prunedBlocks);
    if (!ok) return;

    toast('Removed section', {
      action: {
        label: 'Undo',
        onClick: async () => {
          const inserted = await Promise.all(groupPieces.map(async (p) => {
            const { id: _oldId, ...content } = p;
            const { data, error } = await supabase
              .from('gw_concert_program_pieces')
              .insert(content)
              .select('id')
              .single();
            if (error || !data) return null;
            return { oldId: p.id, newId: data.id as string };
          }));
          const idMap = new Map(
            inserted.filter((x): x is { oldId: string; newId: string } => !!x).map((x) => [x.oldId, x.newId]),
          );
          const restoredGroup: PieceGroupBlock = {
            ...group,
            pieceIds: group.pieceIds.map((pid) => idMap.get(pid) ?? pid),
          };
          const restoredBlocks = snapshotBlocks.map((b) => (b.id === blockId ? restoredGroup : b));
          await persistBlocksNow(restoredBlocks);
          qc.invalidateQueries({ queryKey: ['concert-program-pieces', id] });
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

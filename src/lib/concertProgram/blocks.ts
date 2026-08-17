import { newBlockId, type PieceGroupBlock, type ProgramBlock } from './types';

interface DerivePiece { id: string; sort_order: number; section_heading: string | null }

export function deriveDefaultBlocks(
  program: { notes: string | null },
  pieces: DerivePiece[],
  roster: Array<{ members: unknown[] }>,
): ProgramBlock[] {
  const blocks: ProgramBlock[] = [{ id: newBlockId(), kind: 'title', showLogo: false, showOrgName: false }];

  const ordered = pieces.slice().sort((a, b) => a.sort_order - b.sort_order);
  let current: PieceGroupBlock | null = null;
  for (const p of ordered) {
    const heading = p.section_heading ?? null;
    if (!current || current.sectionHeading !== heading) {
      current = { id: newBlockId(), kind: 'piece-group', sectionHeading: heading, pieceIds: [], creditLine: null };
      blocks.push(current);
    }
    current.pieceIds.push(p.id);
  }
  if (!current) {
    blocks.push({ id: newBlockId(), kind: 'piece-group', sectionHeading: null, pieceIds: [], creditLine: null });
  }

  if (program.notes && program.notes.trim()) {
    blocks.push({ id: newBlockId(), kind: 'text', text: program.notes, align: 'center' });
  }
  if (roster.some((s) => s.members.length > 0)) {
    blocks.push({ id: newBlockId(), kind: 'roster' });
  }
  blocks.push({ id: newBlockId(), kind: 'footer' });
  return blocks;
}

export function defaultNewProgramBlocks(): ProgramBlock[] {
  return [
    { id: newBlockId(), kind: 'title', showLogo: false, showOrgName: false },
    { id: newBlockId(), kind: 'piece-group', sectionHeading: null, pieceIds: [], creditLine: null },
    { id: newBlockId(), kind: 'divider' },
    { id: newBlockId(), kind: 'footer' },
  ];
}

// Self-heal on every load (spec "blocks ↔ pieces consistency"): drop dangling
// pieceIds; append piece rows referenced by no block to the last group
// (visible, never orphaned); drop groups emptied of REAL pieces — but only
// when at least one other piece-group remains, so the editor always has a
// landing spot for "Add piece".
export function reconcileBlocks(
  blocks: ProgramBlock[],
  pieces: Array<{ id: string }>,
): { blocks: ProgramBlock[]; changed: boolean } {
  const valid = new Set(pieces.map((p) => p.id));
  const referenced = new Set<string>();
  let changed = false;

  let next: ProgramBlock[] = blocks.map((b) => {
    if (b.kind !== 'piece-group') return b;
    const kept = b.pieceIds.filter((id) => {
      if (!valid.has(id) || referenced.has(id)) return false; // dangling or duplicate ref
      referenced.add(id);
      return true;
    });
    if (kept.length !== b.pieceIds.length) {
      changed = true;
      return { ...b, pieceIds: kept };
    }
    return b;
  });

  const orphans = pieces.filter((p) => !referenced.has(p.id)).map((p) => p.id);
  if (orphans.length > 0) {
    changed = true;
    const lastGroupIdx = next.map((b) => b.kind).lastIndexOf('piece-group');
    if (lastGroupIdx >= 0) {
      const g = next[lastGroupIdx] as PieceGroupBlock;
      next = next.slice();
      next[lastGroupIdx] = { ...g, pieceIds: [...g.pieceIds, ...orphans] };
    } else {
      const footerIdx = next.findIndex((b) => b.kind === 'footer');
      const group: PieceGroupBlock = { id: newBlockId(), kind: 'piece-group', sectionHeading: null, pieceIds: orphans, creditLine: null };
      next = next.slice();
      next.splice(footerIdx === -1 ? next.length : footerIdx, 0, group);
    }
  }

  // Remove emptied groups, preserving at least one.
  const groupCount = next.filter((b) => b.kind === 'piece-group').length;
  if (groupCount > 1) {
    const pruned = next.filter((b) => !(b.kind === 'piece-group' && b.pieceIds.length === 0));
    if (pruned.length !== next.length && pruned.some((b) => b.kind === 'piece-group')) {
      next = pruned;
      changed = true;
    }
  }

  return changed ? { blocks: next, changed } : { blocks, changed: false };
}

export function flattenPieceOrder(blocks: ProgramBlock[]): string[] {
  return blocks.flatMap((b) => (b.kind === 'piece-group' ? b.pieceIds : []));
}

import { describe, it, expect } from 'vitest';
import { deriveDefaultBlocks, defaultNewProgramBlocks, reconcileBlocks, flattenPieceOrder } from './blocks';
import type { PieceGroupBlock, ProgramBlock } from './types';

const piece = (id: string, sort: number, heading: string | null = null) =>
  ({ id, sort_order: sort, section_heading: heading });

describe('deriveDefaultBlocks', () => {
  it('groups consecutive pieces by section_heading changes', () => {
    const blocks = deriveDefaultBlocks(
      { notes: null },
      [piece('a', 0, null), piece('b', 1, null), piece('c', 2, 'Part II'), piece('d', 3, 'Part II'), piece('e', 4, null)],
      [],
    );
    const groups = blocks.filter((b): b is PieceGroupBlock => b.kind === 'piece-group');
    expect(groups.map((g) => g.pieceIds)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    expect(groups.map((g) => g.sectionHeading)).toEqual([null, 'Part II', null]);
    expect(blocks[0].kind).toBe('title');
    expect(blocks[blocks.length - 1].kind).toBe('footer');
  });
  it('orders pieces by sort_order before grouping', () => {
    const blocks = deriveDefaultBlocks({ notes: null }, [piece('b', 2), piece('a', 1)], []);
    const g = blocks.find((b): b is PieceGroupBlock => b.kind === 'piece-group')!;
    expect(g.pieceIds).toEqual(['a', 'b']);
  });
  it('legacy program: notes become a text block, roster included only when members exist', () => {
    const withMembers = deriveDefaultBlocks({ notes: 'Thanks to our patrons.' }, [piece('a', 0)], [{ members: [{}] }]);
    expect(withMembers.some((b) => b.kind === 'text' && b.text === 'Thanks to our patrons.')).toBe(true);
    expect(withMembers.some((b) => b.kind === 'roster')).toBe(true);
    const noMembers = deriveDefaultBlocks({ notes: null }, [piece('a', 0)], [{ members: [] }]);
    expect(noMembers.some((b) => b.kind === 'roster')).toBe(false);
  });
  it('no pieces → one empty piece-group so the editor has a landing spot', () => {
    const blocks = deriveDefaultBlocks({ notes: null }, [], []);
    const g = blocks.find((b): b is PieceGroupBlock => b.kind === 'piece-group')!;
    expect(g.pieceIds).toEqual([]);
  });
});

describe('defaultNewProgramBlocks', () => {
  it('is title, empty piece-group, divider, footer', () => {
    expect(defaultNewProgramBlocks().map((b) => b.kind)).toEqual(['title', 'piece-group', 'divider', 'footer']);
  });
});

describe('reconcileBlocks', () => {
  const group = (id: string, pieceIds: string[]): PieceGroupBlock =>
    ({ id, kind: 'piece-group', sectionHeading: null, pieceIds, creditLine: null });
  const base: ProgramBlock[] = [
    { id: 't', kind: 'title', showLogo: false, showOrgName: false },
    group('g1', ['a', 'b']),
    group('g2', ['c']),
    { id: 'f', kind: 'footer' },
  ];
  it('drops dangling pieceIds', () => {
    const { blocks, changed } = reconcileBlocks(base, [{ id: 'a' }, { id: 'c' }]);
    expect(changed).toBe(true);
    expect((blocks[1] as PieceGroupBlock).pieceIds).toEqual(['a']);
  });
  it('appends unreferenced pieces to the LAST piece-group', () => {
    const { blocks, changed } = reconcileBlocks(base, [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'z' }]);
    expect(changed).toBe(true);
    expect((blocks[2] as PieceGroupBlock).pieceIds).toEqual(['c', 'z']);
  });
  it('creates a piece-group before the footer when none exists and orphans need a home', () => {
    const { blocks } = reconcileBlocks(
      [{ id: 't', kind: 'title', showLogo: false, showOrgName: false }, { id: 'f', kind: 'footer' }],
      [{ id: 'z' }],
    );
    const idx = blocks.findIndex((b) => b.kind === 'piece-group');
    expect(idx).toBeGreaterThan(-1);
    expect(idx).toBeLessThan(blocks.findIndex((b) => b.kind === 'footer'));
    expect((blocks[idx] as PieceGroupBlock).pieceIds).toEqual(['z']);
  });
  it('removes a group emptied of pieces (spec: "a group emptied of pieces is removed") but keeps the only remaining group', () => {
    const { blocks } = reconcileBlocks(base, [{ id: 'c' }]);
    // g1 lost both pieces → removed; g2 keeps c.
    expect(blocks.filter((b) => b.kind === 'piece-group')).toHaveLength(1);
  });
  it('no-op returns changed: false and the SAME array reference', () => {
    const pieces = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const r = reconcileBlocks(base, pieces);
    expect(r.changed).toBe(false);
    expect(r.blocks).toBe(base);
  });
});

describe('flattenPieceOrder', () => {
  it('returns pieceIds in block order', () => {
    const blocks: ProgramBlock[] = [
      { id: 't', kind: 'title', showLogo: false, showOrgName: false },
      { id: 'g1', kind: 'piece-group', sectionHeading: null, pieceIds: ['b', 'a'], creditLine: null },
      { id: 'd', kind: 'divider' },
      { id: 'g2', kind: 'piece-group', sectionHeading: 'II', pieceIds: ['c'], creditLine: null },
    ];
    expect(flattenPieceOrder(blocks)).toEqual(['b', 'a', 'c']);
  });
});

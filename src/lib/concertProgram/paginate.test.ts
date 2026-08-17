import { describe, it, expect } from 'vitest';
import { blocksToUnits, unitKey, paginateProgram, type FlowUnit } from './paginate';
import type { ProgramBlock } from './types';

const H = (pairs: Array<[string, number]>) => new Map(pairs);
const title: ProgramBlock = { id: 't', kind: 'title', showLogo: false, showOrgName: false };
const footer: ProgramBlock = { id: 'f', kind: 'footer' };
const group = (id: string, pieceIds: string[], credit: string | null = null): ProgramBlock =>
  ({ id, kind: 'piece-group', sectionHeading: 'Part', pieceIds, creditLine: credit });

describe('blocksToUnits', () => {
  it('expands groups into header/lines/credit and roster into sections', () => {
    const blocks: ProgramBlock[] = [title, group('g', ['a', 'b'], 'Sung by the students'), { id: 'r', kind: 'roster' }, footer];
    const keys = blocksToUnits(blocks, ['s1', 's2']).map(unitKey);
    expect(keys).toEqual(['block:t', 'gh:g', 'pl:g:a', 'pl:g:b', 'gc:g', 'rs:r:s1', 'rs:r:s2', 'block:f']);
  });
  it('omits the credit unit when creditLine is null and header when heading is null with no credit', () => {
    const g: ProgramBlock = { id: 'g', kind: 'piece-group', sectionHeading: null, pieceIds: ['a'], creditLine: null };
    expect(blocksToUnits([g], []).map(unitKey)).toEqual(['pl:g:a']);
  });
});

describe('paginateProgram', () => {
  it('keeps a group together by pushing it to the next page when it fits a full page', () => {
    const blocks = [title, group('g', ['a', 'b'])];
    const r = paginateProgram(blocks, [], H([
      ['block:t', 6], ['gh:g', 1], ['pl:g:a', 2], ['pl:g:b', 2],
    ]), 9.5);
    expect(r.pages).toHaveLength(2);
    expect(r.pages[0].map((i) => unitKey(i.unit))).toEqual(['block:t']);
    expect(r.pages[1].map((i) => unitKey(i.unit))).toEqual(['gh:g', 'pl:g:a', 'pl:g:b']);
    expect(r.oversized).toEqual([]);
  });
  it('splits an over-tall group at a piece boundary with a continued header; credit rides the last chunk', () => {
    const pieces = ['a', 'b', 'c', 'd', 'e', 'f6'];
    const blocks = [group('g', pieces, 'credit')];
    const heights: Array<[string, number]> = [['gh:g', 1], ['gc:g', 1], ...pieces.map((p): [string, number] => [`pl:g:${p}`, 2])];
    const r = paginateProgram(blocks, [], H(heights), 9.5);
    // Page 1: header(1) + 4 lines(8) = 9. Page 2: continued header(1) + 2 lines(4) + credit(1).
    expect(r.pages).toHaveLength(2);
    expect(r.pages[0].map((i) => unitKey(i.unit))).toEqual(['gh:g', 'pl:g:a', 'pl:g:b', 'pl:g:c', 'pl:g:d']);
    expect(r.pages[0][0].continued).toBeUndefined();
    expect(r.pages[1][0]).toMatchObject({ continued: true });
    expect(r.pages[1].map((i) => unitKey(i.unit))).toEqual(['gh:g', 'pl:g:e', 'pl:g:f6', 'gc:g']);
  });
  it('roster splits between sections without repetition marks', () => {
    const blocks: ProgramBlock[] = [{ id: 'r', kind: 'roster' }];
    const r = paginateProgram(blocks, ['s1', 's2', 's3'], H([
      ['rs:r:s1', 5], ['rs:r:s2', 5], ['rs:r:s3', 5],
    ]), 9.5);
    expect(r.pages.map((p) => p.map((i) => unitKey(i.unit)))).toEqual([
      ['rs:r:s1'], ['rs:r:s2'], ['rs:r:s3'],
    ]);
  });
  it('flags an atomic unit taller than the page and still places it alone', () => {
    const blocks: ProgramBlock[] = [title, { id: 'x', kind: 'text', text: 'long', align: 'left' }];
    const r = paginateProgram(blocks, [], H([['block:t', 1], ['block:x', 12]]), 9.5);
    expect(r.pages).toHaveLength(2);
    expect(r.oversized).toEqual(['block:x']);
  });
  it('missing heights count as 0 and everything lands on one page', () => {
    const r = paginateProgram([title, footer], [], new Map(), 9.5);
    expect(r.pages).toHaveLength(1);
  });
});

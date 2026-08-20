import { describe, it, expect } from 'vitest';
import { paginateBlocks, pageCountForBlocks } from './paginateBlocks';

// US Letter, 1in margins, 96dpi.
const PAGE = 864;

describe('paginateBlocks', () => {
  it('keeps everything on one page when it fits', () => {
    expect(paginateBlocks([100, 200, 300], PAGE)).toEqual([]);
    expect(pageCountForBlocks([100, 200, 300], PAGE)).toBe(1);
  });

  it('breaks before the block that would overflow', () => {
    // 400 + 400 = 800 fits; the third would make 1200, so it starts page 2.
    expect(paginateBlocks([400, 400, 400], PAGE)).toEqual([2]);
    expect(pageCountForBlocks([400, 400, 400], PAGE)).toBe(2);
  });

  it('fills a page exactly without spilling', () => {
    // Exactly 864 must NOT break — an off-by-one here leaves a blank page.
    expect(paginateBlocks([864], PAGE)).toEqual([]);
    expect(paginateBlocks([432, 432], PAGE)).toEqual([]);
    expect(paginateBlocks([432, 432, 1], PAGE)).toEqual([2]);
  });

  it('never breaks before the first block', () => {
    // Breaking at index 0 would leave page 1 blank.
    expect(paginateBlocks([5000], PAGE)).toEqual([]);
    expect(paginateBlocks([5000, 10], PAGE)).toEqual([1]);
  });

  it('gives an over-tall block its own page and moves on', () => {
    // A 3-page-tall table: it starts a page, overflows it, and the block
    // after it starts the next page. The bug this guards against is a block
    // taller than a page causing a break before EVERY later block.
    expect(paginateBlocks([100, 3000, 100], PAGE)).toEqual([1, 2]);
  });

  it('is stable — the same heights always give the same breaks', () => {
    // The property that stops the measure/insert/measure loop.
    const heights = [200, 300, 400, 250, 900, 100];
    const first = paginateBlocks(heights, PAGE);
    expect(paginateBlocks(heights, PAGE)).toEqual(first);
    expect(paginateBlocks([...heights], PAGE)).toEqual(first);
  });

  it('survives measurements the DOM actually produces', () => {
    // Zero-height blocks appear before layout; NaN when an element is
    // detached mid-measure.
    expect(paginateBlocks([0, 0, 0], PAGE)).toEqual([]);
    expect(paginateBlocks([NaN, 500, 500], PAGE)).toEqual([2]);
    expect(paginateBlocks([100, -50, 100], PAGE)).toEqual([]);
  });

  it('refuses to work with a nonsensical page height', () => {
    // Rather than looping or producing a break per block.
    expect(paginateBlocks([100, 100], 0)).toEqual([]);
    expect(paginateBlocks([100, 100], NaN)).toEqual([]);
  });

  it('paginates a long document into the expected number of pages', () => {
    // 60 paragraphs at 24px = 1440px = two pages' worth.
    const heights = Array.from({ length: 60 }, () => 24);
    expect(pageCountForBlocks(heights, PAGE)).toBe(2);
  });
});

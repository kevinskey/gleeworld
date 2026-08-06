import { describe, it, expect } from 'vitest';
import {
  blockLines, flowBlocks, pageRoom, FLOW_PAGES, LINES_PER_PAGE,
} from './flow';
import type { RenderedBlock } from './aidEdits';

/**
 * The pagination engine.
 *
 * What makes this worth testing hard: every failure here is invisible until
 * the copies are printed. Content that overruns is cut at the fold; content
 * that flows wrong reads out of order; a heading stranded at the foot of a
 * page sends the reader across the fold to find what it introduced.
 */

const block = (over: Partial<RenderedBlock['entry']> = {}, gapAfter = 0): RenderedBlock => ({
  key: `k${Math.random()}`,
  entry: { label: 'ITEM', ...over },
  inserted: false,
  gapAfter,
});

/** Enough plain blocks to fill n pages exactly, at 1 line each. */
const fill = (n: number) => Array.from({ length: n }, () => block());

describe('blockLines', () => {
  it('counts a heading as one line', () => {
    expect(blockLines(block())).toBe(1);
  });

  it('counts a heading with a title as two', () => {
    expect(blockLines(block({ title: 'O Come Emmanuel' }))).toBe(2);
  });

  it('wraps long prose across lines', () => {
    const short = blockLines(block({ label: '', summary: 'Short.' }));
    const long = blockLines(block({ label: '', summary: 'x'.repeat(200) }));
    expect(long).toBeGreaterThan(short);
  });

  it('gives a boxed notice room for its border', () => {
    expect(blockLines(block({ label: '', notice: 'Welcome.' }))).toBeGreaterThan(1);
  });

  // An engraved setting is the single biggest thing on a page; under-counting
  // it is what runs music over the fold.
  it('reserves real height for a score', () => {
    expect(blockLines(block({ imageUrl: 'psalm.jpg' }))).toBeGreaterThan(10);
  });

  it('charges a gap to the block that asked for it', () => {
    expect(blockLines(block({}, 0.5))).toBeGreaterThan(blockLines(block({}, 0)));
  });

  it('never costs less than a line', () => {
    expect(blockLines(block({ label: '' }))).toBe(1);
  });
});

describe('flowBlocks', () => {
  it('keeps everything on the first page while it fits', () => {
    const result = flowBlocks(fill(5));
    expect(result.pages.insideLeft).toHaveLength(5);
    expect(result.pages.insideRight).toHaveLength(0);
    expect(result.overflowLines).toBe(0);
  });

  // The whole point: content past the bottom moves on rather than being cut.
  it('moves the surplus to the next page instead of cutting it', () => {
    const result = flowBlocks(fill(LINES_PER_PAGE + 3));
    expect(result.pages.insideLeft).toHaveLength(LINES_PER_PAGE);
    expect(result.pages.insideRight).toHaveLength(3);
    expect(result.overflowLines).toBe(0);
  });

  it('flows on through the third page', () => {
    const result = flowBlocks(fill(LINES_PER_PAGE * 2 + 2));
    expect(result.pages.back).toHaveLength(2);
  });

  it('reads in order across the pages', () => {
    const blocks = fill(LINES_PER_PAGE + 2).map((b, i) => ({ ...b, key: `b${i}` }));
    const result = flowBlocks(blocks);
    const order = FLOW_PAGES.flatMap((p) => result.pages[p].map((b) => b.key));
    expect(order).toEqual(blocks.map((b) => b.key));
  });

  // Four pages is the format. Surplus is reported so the editor can say so —
  // never silently truncated, which is what printing would do on its own.
  it('reports what will not fit rather than hiding it', () => {
    const result = flowBlocks(fill(LINES_PER_PAGE * 3 + 6));
    expect(result.overflowLines).toBeGreaterThan(0);
    expect(result.dropped).toHaveLength(6);
    expect(result.pages.back.length).toBeGreaterThan(0);
  });

  it('places a block taller than a page rather than looping forever', () => {
    const huge = { ...block({ label: '', summary: 'x'.repeat(20_000) }), key: 'huge' };
    const result = flowBlocks([huge]);
    expect(FLOW_PAGES.some((p) => result.pages[p].some((b) => b.key === 'huge'))).toBe(true);
  });

  // A section heading alone at the foot of a page sends the reader across the
  // fold to find what it introduced. Dividers only: a bare label like HOMILY
  // is a complete entry, and guarding those wasted most of a panel.
  it('does not strand a section heading at the bottom of a page', () => {
    const blocks = [
      ...fill(LINES_PER_PAGE - 3),
      { ...block({ label: 'LITURGY OF THE EUCHARIST', divider: true }), key: 'heading' },
      { ...block({ label: 'PREPARATION', title: 'O Come Emmanuel' }), key: 'under' },
    ];
    const result = flowBlocks(blocks);
    expect(result.pages.insideLeft.some((b) => b.key === 'heading')).toBe(false);
    expect(result.pages.insideRight[0].key).toBe('heading');
  });

  it('handles an empty document', () => {
    const result = flowBlocks([]);
    expect(result.overflowLines).toBe(0);
    for (const p of FLOW_PAGES) expect(result.pages[p]).toHaveLength(0);
  });
});

describe('pageRoom', () => {
  it('reports the lines still free on each page', () => {
    const result = flowBlocks(fill(5));
    const room = pageRoom(result);
    expect(room.insideLeft).toBe(LINES_PER_PAGE - 5);
    expect(room.insideRight).toBe(LINES_PER_PAGE);
  });

  it('never reports negative room', () => {
    const result = flowBlocks(fill(LINES_PER_PAGE * 3 + 20));
    for (const p of FLOW_PAGES) expect(pageRoom(result)[p]).toBeGreaterThanOrEqual(0);
  });
});

describe('the orphan guard is narrow', () => {
  // Guarding every bare label pushed content to the next page for no reason
  // and left most of a panel empty.
  it('does not treat a plain entry like HOMILY as a section heading', () => {
    const blocks = Array.from({ length: LINES_PER_PAGE }, () => block({ label: 'HOMILY' }));
    expect(flowBlocks(blocks).pages.insideLeft).toHaveLength(LINES_PER_PAGE);
  });
});

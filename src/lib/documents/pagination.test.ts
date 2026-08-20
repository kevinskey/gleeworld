import { describe, it, expect } from 'vitest';
import { pageContentHeightPx, pageCount, pageBoundaries, describePagination } from './pagination';

// US Letter at 96dpi with 1in margins: (11 - 2) * 96 = 864px of usable height.
const LETTER_1IN = 864;

describe('pageContentHeightPx', () => {
  it('is the sheet minus its top and bottom margins', () => {
    expect(pageContentHeightPx({})).toBe(LETTER_1IN);
    expect(pageContentHeightPx(undefined)).toBe(LETTER_1IN);
  });

  it('grows as margins shrink', () => {
    expect(pageContentHeightPx({ marginIn: 0.5 })).toBe((11 - 1) * 96);
  });

  it('follows the page size', () => {
    // A4 is taller than Letter, so a page holds more.
    expect(pageContentHeightPx({ pageSize: 'a4' })).toBeCloseTo((11.69 - 2) * 96, 5);
  });

  it('never returns zero', () => {
    // A zero period would make the boundary loop run forever.
    expect(pageContentHeightPx({ marginIn: 99 })).toBeGreaterThan(0);
  });
});

describe('pageCount', () => {
  it('treats an empty document as one page, not zero', () => {
    expect(pageCount(0, LETTER_1IN)).toBe(1);
  });

  it('counts partial pages as a page', () => {
    expect(pageCount(1, LETTER_1IN)).toBe(1);
    expect(pageCount(LETTER_1IN, LETTER_1IN)).toBe(1);
    expect(pageCount(LETTER_1IN + 1, LETTER_1IN)).toBe(2);
    expect(pageCount(LETTER_1IN * 3, LETTER_1IN)).toBe(3);
  });

  it('survives a bad measurement rather than dividing by zero', () => {
    // ResizeObserver reports 0 before first layout, and NaN if the element
    // has gone away mid-measure.
    expect(pageCount(NaN, LETTER_1IN)).toBe(1);
    expect(pageCount(500, 0)).toBe(1);
  });
});

describe('pageBoundaries', () => {
  it('draws nothing on a single-page document', () => {
    expect(pageBoundaries(200, LETTER_1IN)).toEqual([]);
  });

  it('draws a rule between pages but never under the last line', () => {
    // Three pages of content = two boundaries. A third rule at the very end
    // would read as a horizontal rule the user never inserted.
    expect(pageBoundaries(LETTER_1IN * 2.5, LETTER_1IN)).toEqual([LETTER_1IN, LETTER_1IN * 2]);
  });

  it('puts a boundary exactly one page-height apart', () => {
    const bounds = pageBoundaries(LETTER_1IN * 4, LETTER_1IN);
    expect(bounds).toHaveLength(3);
    for (let i = 0; i < bounds.length; i += 1) {
      expect(bounds[i]).toBe(LETTER_1IN * (i + 1));
    }
  });
});

describe('describePagination', () => {
  it('singularises one page', () => {
    expect(describePagination(1)).toBe('1 page');
    expect(describePagination(7)).toBe('7 pages');
  });
});

import { describe, it, expect } from 'vitest';
import { imposeHalfFold, paddedPanelCount } from './impose';

describe('paddedPanelCount', () => {
  it('pads to a multiple of 4 with a floor of 4', () => {
    expect(paddedPanelCount(1)).toBe(4);
    expect(paddedPanelCount(4)).toBe(4);
    expect(paddedPanelCount(5)).toBe(8);
    expect(paddedPanelCount(6)).toBe(8);
    expect(paddedPanelCount(9)).toBe(12);
  });
});

describe('imposeHalfFold (saddle order, spec formula)', () => {
  it('4 panels → one sheet: front [4|1], back [2|3] (1-based)', () => {
    expect(imposeHalfFold(4)).toEqual([{ front: [3, 0], back: [1, 2] }]);
  });
  it('8 panels → two sheets', () => {
    expect(imposeHalfFold(8)).toEqual([
      { front: [7, 0], back: [1, 6] },
      { front: [5, 2], back: [3, 4] },
    ]);
  });
  it('12 panels → three sheets', () => {
    expect(imposeHalfFold(12)).toEqual([
      { front: [11, 0], back: [1, 10] },
      { front: [9, 2], back: [3, 8] },
      { front: [7, 4], back: [5, 6] },
    ]);
  });
  it('6 real panels are padded to 8; blanks are indexes >= 6', () => {
    const sheets = imposeHalfFold(6);
    expect(sheets).toHaveLength(2);
    expect(sheets[0].front).toEqual([7, 0]); // 7 is a blank
  });
  it('long-edge flip mirrors the back side', () => {
    expect(imposeHalfFold(4, 'long-edge')).toEqual([{ front: [3, 0], back: [2, 1] }]);
  });
});

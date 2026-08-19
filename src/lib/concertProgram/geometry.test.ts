import { describe, it, expect } from 'vitest';
import { LETTER, PANEL, contentWidthIn, contentHeightIn, PX_PER_IN } from './geometry';

describe('concert program geometry', () => {
  it('letter portrait content box is 7.0 x 9.5 inches', () => {
    expect(contentWidthIn('letter-portrait')).toBeCloseTo(7.0);
    expect(contentHeightIn('letter-portrait')).toBeCloseTo(9.5);
  });
  it('half-fold panel content box is 4.5 x 7.5 inches', () => {
    expect(contentWidthIn('half-fold')).toBeCloseTo(4.5);
    expect(contentHeightIn('half-fold')).toBeCloseTo(7.5);
  });
  it('sheet dimensions match the spec', () => {
    expect(LETTER).toEqual({ sheetW: 8.5, sheetH: 11, pad: 0.75 });
    expect(PANEL).toEqual({ sheetW: 5.5, sheetH: 8.5, pad: 0.5 });
    expect(PX_PER_IN).toBe(96);
  });
});

import { describe, it, expect } from 'vitest';
import { scoreToLevel } from '../domains';

describe('scoreToLevel', () => {
  it('maps 0/5 and 1/5 to Level 1', () => {
    expect(scoreToLevel(0, 5)).toBe(1);
    expect(scoreToLevel(1, 5)).toBe(1);
  });
  it('maps 2/5 to Level 3', () => { expect(scoreToLevel(2, 5)).toBe(3); });
  it('maps 3/5 to Level 5', () => { expect(scoreToLevel(3, 5)).toBe(5); });
  it('maps 4/5 to Level 8', () => { expect(scoreToLevel(4, 5)).toBe(8); });
  it('maps 5/5 to Level 11', () => { expect(scoreToLevel(5, 5)).toBe(11); });
  it('rejects non-5 totals', () => { expect(() => scoreToLevel(3, 4)).toThrow(); });
});

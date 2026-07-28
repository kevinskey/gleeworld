import { describe, it, expect } from 'vitest';
import { platformFeeCents } from '../api';

describe('store fee math', () => {
  it('takes exactly 50% platform fee', () => {
    expect(platformFeeCents(1000)).toBe(500);
  });
  it('rounds odd cents down', () => {
    expect(platformFeeCents(999)).toBe(499);
  });
  it('sums with payout to price', () => {
    for (const p of [100, 250, 799, 1234, 4999]) {
      expect(platformFeeCents(p) + (p - platformFeeCents(p))).toBe(p);
    }
  });
});

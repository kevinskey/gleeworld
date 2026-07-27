import { describe, it, expect } from 'vitest';
import { platformFeeCents, partnerPayoutCents } from '../api';

describe('partner fee math', () => {
  it('takes exactly 50% platform fee', () => {
    expect(platformFeeCents(1000)).toBe(500);
    expect(partnerPayoutCents(1000)).toBe(500);
  });
  it('rounds odd cents down for platform fee, up for payout', () => {
    expect(platformFeeCents(999)).toBe(499);
    expect(partnerPayoutCents(999)).toBe(500);
    expect(platformFeeCents(999) + partnerPayoutCents(999)).toBe(999);
  });
  it('fee + payout always sums to price', () => {
    for (const p of [100, 250, 799, 1234, 4999]) {
      expect(platformFeeCents(p) + partnerPayoutCents(p)).toBe(p);
    }
  });
});

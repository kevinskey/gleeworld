import { describe, it, expect } from 'vitest';
import { itemRefundAmountCents, deriveOrderStatus } from './refunds';

describe('itemRefundAmountCents', () => {
  it('refunds unit price × quantity (seat licensing)', () => {
    expect(itemRefundAmountCents({ price_cents: 500, quantity: 3 })).toBe(1500);
  });
  it('treats missing/zero quantity as 1', () => {
    expect(itemRefundAmountCents({ price_cents: 500, quantity: 0 })).toBe(500);
    expect(itemRefundAmountCents({ price_cents: 500, quantity: null })).toBe(500);
  });
});

describe('deriveOrderStatus', () => {
  it('is refunded when every item is refunded', () => {
    expect(deriveOrderStatus([
      { refunded_at: '2026-08-17T00:00:00Z' },
      { refunded_at: '2026-08-17T01:00:00Z' },
    ])).toBe('refunded');
  });
  it('is partial_refund when only some items are refunded', () => {
    expect(deriveOrderStatus([
      { refunded_at: '2026-08-17T00:00:00Z' },
      { refunded_at: null },
    ])).toBe('partial_refund');
  });
  it('is paid when nothing is refunded', () => {
    expect(deriveOrderStatus([{ refunded_at: null }, { refunded_at: null }])).toBe('paid');
  });
  it('is paid for an empty item list (defensive)', () => {
    expect(deriveOrderStatus([])).toBe('paid');
  });
});

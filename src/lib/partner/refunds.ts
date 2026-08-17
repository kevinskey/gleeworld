// Refund math for partner-store orders. gw_partner_order_items stores the
// UNIT price; the Stripe charge for an item was unit_amount × quantity
// (seat licensing), so a refund must cover the full line total.
// Mirrored in supabase/functions/partner-refund/index.ts (Deno can't
// import from src/) — keep the two in sync.

export function itemRefundAmountCents(item: {
  price_cents: number;
  quantity: number | null;
}): number {
  return item.price_cents * Math.max(1, item.quantity ?? 1);
}

/** Order status derived from its items' refund state. */
export function deriveOrderStatus(
  items: Array<{ refunded_at: string | null }>,
): 'paid' | 'partial_refund' | 'refunded' {
  if (items.length === 0) return 'paid';
  const refunded = items.filter((i) => i.refunded_at != null).length;
  if (refunded === 0) return 'paid';
  return refunded === items.length ? 'refunded' : 'partial_refund';
}

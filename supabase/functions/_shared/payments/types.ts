export type Provider = 'stripe';
export interface LineItem { name: string; unitPriceCents: number; quantity: number; }
export interface CreateCheckoutArgs {
  account: string | null; lineItems: LineItem[]; orderId: string; storeType: string;
  successUrl: string; cancelUrl: string; buyerEmail?: string;
  /**
   * Platform cut, in cents, taken off a Connect direct charge. Ignored when
   * `account` is null — Stripe rejects an application fee on a charge that
   * isn't going to a connected account, and there is nobody to take a cut
   * from when the platform is collecting for itself.
   */
  applicationFeeCents?: number;
  /** Extra metadata merged onto both the session and the PaymentIntent. */
  metadata?: Record<string, string>;
}
export interface ParsedWebhook {
  type: string; orderId: string | null; sessionId: string | null;
  paymentIntentId: string | null; amountCents: number | null; paid: boolean;
}

export type Provider = 'stripe';
export interface LineItem { name: string; unitPriceCents: number; quantity: number; }
export interface CreateCheckoutArgs {
  account: string | null; lineItems: LineItem[]; orderId: string; storeType: string;
  successUrl: string; cancelUrl: string; buyerEmail?: string;
}
export interface ParsedWebhook {
  type: string; orderId: string | null; sessionId: string | null;
  paymentIntentId: string | null; amountCents: number | null; paid: boolean;
}

import type { CreateCheckoutArgs, ParsedWebhook } from './types.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2025-08-27.basil' });

export async function stripeCreateCheckout(a: CreateCheckoutArgs): Promise<{ url: string }> {
  const opts = a.account ? { stripeAccount: a.account } : undefined; // Connect direct charge when account set
  const metadata = { ...(a.metadata ?? {}), order_id: a.orderId, store_type: a.storeType };
  // A fee only makes sense on a Connect direct charge; see CreateCheckoutArgs.
  const fee = a.account && a.applicationFeeCents && a.applicationFeeCents > 0
    ? { application_fee_amount: a.applicationFeeCents }
    : {};
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: a.lineItems.map(li => ({
      price_data: { currency: 'usd', product_data: { name: li.name }, unit_amount: li.unitPriceCents },
      quantity: li.quantity,
    })),
    customer_email: a.buyerEmail,
    success_url: a.successUrl, cancel_url: a.cancelUrl,
    metadata,
    payment_intent_data: { metadata, ...fee },
  }, opts ? { stripeAccount: a.account! } : undefined);
  if (!session.url) throw new Error('stripe session missing url');
  return { url: session.url };
}

export async function stripeVerifyAndParse(raw: string, sig: string, secret: string): Promise<ParsedWebhook> {
  let event: any;
  if (Deno.env.get('PAYMENTS_TEST_SKIP_VERIFY') === '1') {
    event = JSON.parse(raw);
  } else {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret);
  }
  const o = event?.data?.object ?? {};
  return {
    type: event.type,
    orderId: o.metadata?.order_id ?? null,
    sessionId: o.id ?? null,
    paymentIntentId: (typeof o.payment_intent === 'string' ? o.payment_intent : o.payment_intent?.id) ?? o.id ?? null,
    amountCents: o.amount_total ?? o.amount ?? null,
    paid: o.payment_status === 'paid' || event.type === 'checkout.session.completed',
  };
}

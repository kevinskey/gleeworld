import type { Provider, CreateCheckoutArgs, ParsedWebhook } from './types.ts';
import { stripeCreateCheckout, stripeVerifyAndParse } from './stripe.ts';

export * from './types.ts';

export function createCheckout(provider: Provider, args: CreateCheckoutArgs): Promise<{ url: string }> {
  if (provider === 'stripe') return stripeCreateCheckout(args);
  throw new Error(`unsupported provider: ${provider}`);
}
export function verifyAndParseWebhook(provider: Provider, raw: string, sig: string, secret: string): Promise<ParsedWebhook> {
  if (provider === 'stripe') return stripeVerifyAndParse(raw, sig, secret);
  throw new Error(`unsupported provider: ${provider}`);
}

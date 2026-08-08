// Free-RSVP path test. Run: deno test --allow-net --allow-env supabase/functions/concert-rsvp-checkout/free_rsvp_test.ts
//
// The thing worth pinning is a NEGATIVE: a $0 reservation must never reach
// Stripe. Before this path existed, a free tier still built a Checkout
// session, Stripe rejected the sub-minimum amount, and the guest was told
// "Payment could not be started" and got no ticket.
//
// fetch is stubbed and routed by URL, not by call order, so adding a query
// upstream does not silently break these.

// Env FIRST: SIGNING_SECRET is a module-level const in index.ts, and a static
// `import` would be hoisted above these calls and read an empty secret. The
// dynamic import below is what makes this correct.
Deno.env.set('TICKET_SIGNING_SECRET', 'test-secret');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-srk');
// The Stripe SDK is constructed at module scope in _shared/payments/stripe.ts
// and throws without a key. This dummy is never used to reach Stripe — the
// first test asserts exactly that.
Deno.env.set('STRIPE_SECRET_KEY', 'sk_test_dummy');
// RESEND_API_KEY deliberately unset — sendFreeRsvpEmail must no-op, proving
// the reservation does not depend on the mailer being configured.

const { handler } = await import('./index.ts');

const TENANT = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'kevin',
  name: "Kevin's World",
  // No Stripe at all: a free event must work on a tenant that has never
  // finished Connect onboarding.
  stripe_account_id: null,
  stripe_charges_enabled: false,
  uses_platform_stripe: false,
};
const EVENT = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Free Community Concert',
  box_office_status: 'published',
  box_office_slug: 'free-concert',
  start_date: '2026-10-18T18:00:00Z',
  venue_name: 'Lyke House',
};
const FREE_TIER = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'General Admission',
  price_cents: 0,
  currency: 'usd',
  quantity_total: 100,
  quantity_sold: 0,
};
const ORDER = { id: '44444444-4444-4444-8444-444444444444' };

interface Call { url: string; method: string; body: string }

function install(opts: { tier?: typeof FREE_TIER; fulfill?: unknown } = {}) {
  const calls: Call[] = [];
  const tier = opts.tier ?? FREE_TIER;
  const fulfill = opts.fulfill ?? { ok: true, order_id: ORDER.id };

  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ url, method, body: String(init?.body ?? '') });

    const json = (v: unknown) =>
      Promise.resolve(new Response(JSON.stringify(v), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }));

    if (url.includes('gw_store_checkout_attempts')) return json([]);
    if (url.includes('gw_tenants')) return json([TENANT]);
    if (url.includes('gw_events')) return json([EVENT]);
    if (url.includes('gw_ticket_tiers')) return json([tier]);
    if (url.includes('/rpc/gw_box_office_fulfill_order')) return json(fulfill);
    if (url.includes('gw_ticket_orders')) return json([ORDER]);
    if (url.includes('api.resend.com')) return json({ id: 'email_1' });
    if (url.includes('stripe.com')) return json({ url: 'https://checkout.stripe.com/SHOULD_NOT_HAPPEN' });
    return json([]);
  }) as typeof fetch;

  return calls;
}

function request(body: unknown) {
  return new Request('https://edge/concert-rsvp-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-real-ip': '203.0.113.9' },
    body: JSON.stringify(body),
  });
}

const FREE_BODY = {
  tenant_slug: 'kevin',
  event_slug: 'free-concert',
  tier_id: FREE_TIER.id,
  quantity: 2,
  buyer_name: 'Guest Person',
  buyer_email: 'guest@example.com',
  merch: [],
};

Deno.test('a free RSVP mints tickets without ever calling Stripe', async () => {
  const calls = install();
  const res = await handler(request(FREE_BODY));
  const out = await res.json();

  if (res.status !== 200) throw new Error(`expected 200, got ${res.status}: ${JSON.stringify(out)}`);
  if (out.free !== true) throw new Error(`expected free:true, got ${JSON.stringify(out)}`);
  if (!/\/tickets\/[0-9a-f]{64}$/.test(out.url)) {
    throw new Error(`expected a tickets URL, got ${out.url}`);
  }

  const fulfilled = calls.filter((c) => c.url.includes('gw_box_office_fulfill_order'));
  if (fulfilled.length !== 1) throw new Error(`expected 1 fulfill call, got ${fulfilled.length}`);
  if (!fulfilled[0].body.includes('test-secret')) {
    throw new Error('fulfill must be passed the ticket signing secret');
  }

  // The whole point.
  const stripeCalls = calls.filter((c) => c.url.includes('stripe.com'));
  if (stripeCalls.length !== 0) {
    throw new Error(`a free RSVP reached Stripe: ${stripeCalls.map((c) => c.url).join(', ')}`);
  }

  // And it must not have been marked failed on the way out.
  const failed = calls.filter((c) => c.method === 'PATCH' && c.body.includes('failed'));
  if (failed.length !== 0) throw new Error('free order was marked failed');
});

Deno.test('a sold-out free event is reported as sold out, not as a payment error', async () => {
  const calls = install({ fulfill: { error: 'over_capacity', sold: 100, total: 100 } });
  const res = await handler(request(FREE_BODY));
  const out = await res.json();

  if (res.status !== 409) throw new Error(`expected 409, got ${res.status}`);
  if (!/sold out/i.test(out.error)) throw new Error(`expected a sold-out message, got ${out.error}`);

  // The order must not be left pending, or the guest sees a spinner forever.
  const failed = calls.filter((c) => c.method === 'PATCH' && c.body.includes('failed'));
  if (failed.length !== 1) throw new Error(`expected the order to be marked failed, got ${failed.length}`);
});

Deno.test('a paid tier still goes to Stripe and is never fulfilled here', async () => {
  const calls = install({ tier: { ...FREE_TIER, price_cents: 2500 } });
  await handler(request(FREE_BODY)).catch(() => {});

  const fulfilled = calls.filter((c) => c.url.includes('gw_box_office_fulfill_order'));
  if (fulfilled.length !== 0) {
    throw new Error('a PAID order was fulfilled without Stripe confirming payment');
  }
});

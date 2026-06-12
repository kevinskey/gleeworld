// Creates Stripe Products + one-time Prices for gw_course_product rows that
// don't have a stripe_price_id yet, and writes the IDs back via PostgREST.
//   STRIPE_SECRET_KEY=sk_... SUPABASE_URL=https://supabase.gleeworld.org \
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-stripe-prices.js
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!STRIPE_KEY || !SB_URL || !SB_KEY) {
  console.error('Set STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = (path, opts = {}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...opts.headers,
    },
  });

const stripe = (path, params) =>
  fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  }).then(async (r) => {
    const j = await r.json();
    if (!r.ok) throw new Error(`${path}: ${j.error?.message}`);
    return j;
  });

const rows = await (await sb('gw_course_product?stripe_price_id=is.null&active=is.true&select=id,sku,name,price_cents')).json();
if (!rows.length) {
  console.log('All products already have Stripe prices.');
  process.exit(0);
}
for (const row of rows) {
  const product = await stripe('products', { name: row.name, 'metadata[sku]': row.sku });
  const price = await stripe('prices', {
    product: product.id,
    unit_amount: String(row.price_cents),
    currency: 'usd',
    'metadata[sku]': row.sku,
  });
  const res = await sb(`gw_course_product?id=eq.${row.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ stripe_price_id: price.id }),
  });
  if (!res.ok) throw new Error(`DB writeback failed for ${row.sku}: ${await res.text()}`);
  console.log(`${row.sku}: product=${product.id} price=${price.id} ($${(row.price_cents / 100).toFixed(2)})`);
}

#!/usr/bin/env node
// stripe-setup-tiers.mjs — idempotent Stripe catalog setup for the GleeWorld
// tier restructure (Tiers & Billing plan, Task 5).
//
// Ensures ONE Stripe Product per tier (found via metadata.gw_tier_id, created
// if missing) and ONE Price per tier x {monthly, annual} (found via
// lookup_key, created if missing). Never mutates existing prices — Stripe
// prices are immutable once created, so re-running this script is a no-op
// once the catalog exists (creates are keyed off deterministic
// Idempotency-Key headers too, so even concurrent/retried runs can't create
// duplicates).
//
// This script NEVER connects to Postgres. It only prints the SQL UPDATE
// statements a human (or the runbook) should run against
// gw_billing_plans.stripe_price_id_monthly/annual — see
// docs/superpowers/plans/2026-07-04-tiers-billing.md Task 5 and the ops
// runbook (Task 8) for how those get applied.
//
// Usage:
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup-tiers.mjs
//
// Live-mode keys (sk_live_...) are refused unless CONFIRM_LIVE=yes is also
// set — this script is meant to be run against test mode by default.
//
// No dependencies: uses global fetch (Node >= 18) against
// https://api.stripe.com/v1/*.

// ── Hardcoded tier table ──────────────────────────────────────────────────
// MUST byte-match:
//   - src/lib/planTiers.ts (PLAN_TIERS) — the client/TS source of truth
//   - supabase/migrations/20260704231000_tier_restructure.sql — the DB seed
// Both of those files carry a comment pointing back at this one. If you
// change a tier's label, price, or lookup_key, update all three in the same
// commit.
// Prices updated 2026-08-17 to match the PR #247 price bump in planTiers.ts
// ($15 / $50 / $65 / $250 monthly) — the script had drifted and still carried
// the pre-bump numbers, so the live catalog was never created at the shipped
// prices. Stripe prices are immutable: if a lookup_key already resolves to a
// price with a DIFFERENT amount, this script now fails loudly instead of
// silently keeping the stale price (see ensurePrice).
const TIERS = [
  {
    id: 'personal',
    label: 'Personal',
    monthlyCents: 1500,
    annualCents: 13500,
    lookupKeyMonthly: 'gw_personal_monthly',
    lookupKeyAnnual: 'gw_personal_annual',
  },
  {
    id: 'director_60',
    label: 'Director',
    monthlyCents: 5000,
    annualCents: 50000,
    lookupKeyMonthly: 'gw_director60_monthly',
    lookupKeyAnnual: 'gw_director60_annual',
  },
  {
    id: 'director_150',
    label: 'Director+',
    monthlyCents: 6500,
    annualCents: 65000,
    lookupKeyMonthly: 'gw_director150_monthly',
    lookupKeyAnnual: 'gw_director150_annual',
  },
  {
    id: 'institution',
    label: 'Institution',
    monthlyCents: 25000,
    annualCents: 250000,
    lookupKeyMonthly: 'gw_institution_monthly',
    lookupKeyAnnual: 'gw_institution_annual',
  },
];

// ── Env / safety checks ───────────────────────────────────────────────────
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  console.error('Set STRIPE_SECRET_KEY (test mode: sk_test_...) before running this script.');
  process.exit(1);
}

if (STRIPE_KEY.startsWith('sk_live_') || STRIPE_KEY.startsWith('rk_live_')) {
  console.error('='.repeat(72));
  console.error('!! LIVE-MODE STRIPE KEY DETECTED (sk_live_...) !!');
  console.error('This script is intended to run against Stripe TEST mode.');
  console.error('Running it live will create real Products/Prices in production.');
  console.error('='.repeat(72));
  if (process.env.CONFIRM_LIVE !== 'yes') {
    console.error('Refusing to proceed. Set CONFIRM_LIVE=yes to override (Kevin-gated).');
    process.exit(1);
  }
  console.error('CONFIRM_LIVE=yes set — proceeding against LIVE mode.');
}

// ── Stripe helpers ────────────────────────────────────────────────────────
const STRIPE_API = 'https://api.stripe.com/v1';

async function stripeFetch(method, path, { params, idempotencyKey } = {}) {
  const headers = { Authorization: `Bearer ${STRIPE_KEY}` };
  let url = `${STRIPE_API}/${path}`;
  let body;

  if (method === 'GET') {
    const qs = paramsToQuery(params);
    if (qs) url += `?${qs}`;
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = paramsToFormBody(params);
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch(url, { method, headers, body });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Stripe ${method} /${path} failed: ${msg}`);
  }
  return json;
}

// Builds a query string, handling bracketed array/object keys the way
// Stripe expects (e.g. `metadata['gw_tier_id']` or `lookup_keys[]` with bracket notation).
function paramsToQuery(params) {
  const parts = [];
  for (const [key, value] of Object.entries(params || {})) {
    if (Array.isArray(value)) {
      for (const v of value) parts.push(`${encodeURIComponent(key + '[]')}=${encodeURIComponent(v)}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join('&');
}

function paramsToFormBody(params) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (Array.isArray(value)) {
      for (const v of value) usp.append(key, v);
    } else {
      usp.append(key, value);
    }
  }
  return usp;
}

// Finds the product tagged with metadata.gw_tier_id = tierId. Tries the
// Search API first (requires no special account setting in practice, but
// can occasionally 404/error on older API versions or restricted keys);
// falls back to listing + filtering client-side if search errors out.
async function findProduct(tierId) {
  try {
    // Stripe's Search Query Language wants the metadata value backslash-escaped
    // for embedded quotes/backslashes. Not needed here in practice — tierId is
    // always one of our own hardcoded slugs (personal, director_60, ...) with
    // no quote characters — but documented in case TIERS ever grows a
    // free-form id.
    const search = await stripeFetch('GET', 'products/search', {
      params: { query: `metadata['gw_tier_id']:'${tierId}'` },
    });
    if (search?.data?.length) return search.data[0];
    return null;
  } catch (searchErr) {
    console.warn(`  products/search unavailable (${searchErr.message}); falling back to list+filter`);
    let startingAfter;
    for (;;) {
      const page = await stripeFetch('GET', 'products', {
        params: { limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) },
      });
      const hit = page.data.find((p) => p.metadata?.gw_tier_id === tierId);
      if (hit) return hit;
      if (!page.has_more || page.data.length === 0) return null;
      startingAfter = page.data[page.data.length - 1].id;
    }
  }
}

async function ensureProduct(tier) {
  const existing = await findProduct(tier.id);
  if (existing) {
    console.log(`  product: found ${existing.id} (${existing.name})`);
    return existing;
  }
  const created = await stripeFetch('POST', 'products', {
    params: { name: tier.label, 'metadata[gw_tier_id]': tier.id },
    idempotencyKey: `gw-setup-product-${tier.id}`,
  });
  console.log(`  product: created ${created.id} (${created.name})`);
  return created;
}

async function findPriceByLookupKey(lookupKey) {
  // Stripe's documented list-prices filter requires bracket notation for array params:
  // `lookup_keys[]=a&lookup_keys[]=b` (up to 10) per Stripe API curl form.
  // paramsToQuery emits `key[]` for array entries, which produces the correct form.
  const res = await stripeFetch('GET', 'prices', {
    params: { lookup_keys: [lookupKey], limit: 1 },
  });
  return res.data?.[0] || null;
}

async function ensurePrice(tier, productId, interval) {
  const lookupKey = interval === 'month' ? tier.lookupKeyMonthly : tier.lookupKeyAnnual;
  const unitAmount = interval === 'month' ? tier.monthlyCents : tier.annualCents;

  const existing = await findPriceByLookupKey(lookupKey);
  if (existing) {
    // Stripe prices are immutable. A lookup_key resolving to a different
    // amount means the catalog predates a price change in TIERS — that needs
    // a deliberate migration (new price + transfer_lookup_key), not a silent
    // "found it". Fail loudly so nobody checks out at a stale price.
    if (existing.unit_amount !== unitAmount) {
      throw new Error(
        `price [${lookupKey}] exists as ${existing.id} at ${existing.unit_amount}¢ but TIERS says ${unitAmount}¢ — ` +
        `create a replacement price with transfer_lookup_key manually, then re-run.`,
      );
    }
    console.log(`  price (${interval}): found ${existing.id} [${lookupKey}]`);
    return existing;
  }

  const created = await stripeFetch('POST', 'prices', {
    params: {
      product: productId,
      unit_amount: String(unitAmount),
      currency: 'usd',
      'recurring[interval]': interval,
      lookup_key: lookupKey,
      transfer_lookup_key: 'true',
    },
    idempotencyKey: `gw-setup-price-${lookupKey}`,
  });
  console.log(`  price (${interval}): created ${created.id} [${lookupKey}]`);
  return created;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const results = [];

  for (const tier of TIERS) {
    console.log(`\n${tier.label} (${tier.id})`);
    const product = await ensureProduct(tier);
    const monthly = await ensurePrice(tier, product.id, 'month');
    const annual = await ensurePrice(tier, product.id, 'year');
    results.push({ tier, product, monthly, annual });
  }

  // Summary table.
  console.log('\n' + '='.repeat(96));
  console.log('SUMMARY');
  console.log('='.repeat(96));
  const rows = results.map(({ tier, product, monthly, annual }) => ({
    tier: tier.id,
    product_id: product.id,
    monthly_price_id: monthly.id,
    annual_price_id: annual.id,
  }));
  console.table(rows);

  // Printed SQL — this script never connects to Postgres; a human (or the
  // runbook) applies these against gw_billing_plans.
  console.log('\n-- Apply against gw_billing_plans (does NOT run automatically):');
  for (const { tier, monthly, annual } of results) {
    console.log(
      `UPDATE gw_billing_plans SET stripe_price_id_monthly = '${monthly.id}', ` +
      `stripe_price_id_annual = '${annual.id}' WHERE id = '${tier.id}';`
    );
  }
  console.log('');
}

main().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});

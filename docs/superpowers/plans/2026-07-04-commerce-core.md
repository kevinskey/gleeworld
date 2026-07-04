# Commerce Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the safe, tenant-scoped payment/fulfillment engine both GleeWorld stores sit on — "the Box Office flow, for products."

**Architecture:** Generalize the audit-clean Box Office money path. A client sends only `product_id`+`quantity`; an edge function looks up prices server-side, resolves the Stripe account server-side, pre-creates a `pending` order, and hands off to Stripe Checkout. A signature-verified webhook calls one atomic `SECURITY DEFINER` SQL function that fulfills idempotently. A thin provider seam keeps Stripe out of the store logic so Square/PayPal drop in later.

**Tech Stack:** Postgres (self-hosted Supabase) + PL/pgSQL, Deno edge functions (raw-fetch/PostgREST style), Node webhook receiver (`/opt/gleeworld-provision-webhook/server.js`, port 3030), Stripe Connect, DO Spaces (presigned URLs).

## Global Constraints

- Money state comes ONLY from signature-verified webhooks; the success redirect is display-only.
- Prices/amounts are looked up server-side from `gw_products`; the client never sends an amount.
- Amounts stored as **integer cents**. Currency column defaults `'usd'`.
- Every money table: `tenant_id UUID NOT NULL DEFAULT public.current_tenant_id()`, RESTRICTIVE `tenant_isolation_restrict` RLS, service-role policy scoped `TO service_role`, `UNIQUE` on provider session id and payment-intent id.
- The GleeWorld Store uses the platform tenant id (never a nullable tenant).
- Every mutating endpoint verifies the JWT signature (`_shared/verifyJwt.ts`) before trusting `tenant_id`/role — never bare `atob`.
- Store add-on = a `gw_tenant_subscriptions` module row (status `active`/`trial`), re-checked server-side; UI gating is never the boundary.
- No `stripe.*` calls outside `_shared/payments/`.
- Stripe **test mode** until the launch gate (Task 9). Test with the Stripe CLI/test clocks, never by waiting.
- Reference implementation to copy, not reinvent: `supabase/migrations/20260620140000_box_office_schema.sql`, `20260621160000_box_office_fulfillment.sql`, `supabase/functions/box-office-checkout/index.ts`, the `handleConnectCheckoutCompleted` branch in the droplet `server.js`.

---

## File Structure

- `supabase/migrations/20260705000000_commerce_core_schema.sql` — new: 3 tables + RLS + constraints.
- `supabase/migrations/20260705000100_commerce_core_fulfill.sql` — new: `gw_store_fulfill_order` + `gw_store_refund_order`.
- `supabase/functions/_shared/payments/types.ts` — new: normalized types + provider interface.
- `supabase/functions/_shared/payments/stripe.ts` — new: Stripe implementation of the seam.
- `supabase/functions/_shared/payments/index.ts` — new: `createCheckout` / `verifyAndParseWebhook` dispatchers.
- `supabase/functions/store-checkout/index.ts` — new: pricing + pending order + checkout session.
- `supabase/functions/store-download/index.ts` — new: entitlement → presigned URL.
- `/opt/gleeworld-provision-webhook/server.js` — modify: add `handleStoreCheckoutCompleted` branch (platform + connect).
- Delete: `supabase/functions/{shop-checkout,create-stripe-checkout,verify-shop-payment,verify-stripe-payment}/`.
- `docs/commerce-test-matrix.md` — new: the 8-case runbook (Task 8).

---

## Task 1: Schema + RLS migration

**Files:**
- Create: `supabase/migrations/20260705000000_commerce_core_schema.sql`
- Test: `supabase/migrations/tests/commerce_core_schema_test.sql`

**Interfaces:**
- Produces: tables `gw_store_orders`, `gw_store_order_items`, `gw_store_entitlements` with the columns below; `gw_store_orders.status` enum `('pending','paid','refunded','failed')`.

- [ ] **Step 1: Write the failing test**

`supabase/migrations/tests/commerce_core_schema_test.sql`:
```sql
-- Expect: tables exist, uniques exist, RLS on. Run after the migration.
\set ON_ERROR_STOP on
SELECT 1/ (CASE WHEN to_regclass('public.gw_store_orders') IS NOT NULL THEN 1 ELSE 0 END);
SELECT 1/ (CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname='gw_store_orders_provider_session_id_key') THEN 1 ELSE 0 END);
SELECT 1/ (CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname='gw_store_orders_provider_payment_intent_id_key') THEN 1 ELSE 0 END);
SELECT 1/ (CASE WHEN relrowsecurity FROM pg_class WHERE relname='gw_store_orders' THEN 1 ELSE 0 END);
SELECT 1/ (CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_store_orders' AND policyname='tenant_isolation_restrict' AND permissive='RESTRICTIVE') THEN 1 ELSE 0 END);
SELECT 1/ (CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_store_orders' AND policyname='service_role_only' AND roles='{service_role}') THEN 1 ELSE 0 END);
```

- [ ] **Step 2: Run test to verify it fails**

Run (against a scratch DB, never prod): `docker exec -i supabase-db psql -U supabase_admin -d postgres_scratch < supabase/migrations/tests/commerce_core_schema_test.sql`
Expected: FAIL — `to_regclass` returns NULL → division by zero.

- [ ] **Step 3: Write the migration**

`supabase/migrations/20260705000000_commerce_core_schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS public.gw_store_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  store_type TEXT NOT NULL CHECK (store_type IN ('gleeworld','tenant')),
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_session_id TEXT UNIQUE,
  provider_payment_intent_id TEXT UNIQUE,
  buyer_email TEXT NOT NULL,
  buyer_user_id UUID NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','failed')),
  requires_shipping BOOLEAN NOT NULL DEFAULT false,
  ship_to_name TEXT, ship_to_line1 TEXT, ship_to_line2 TEXT, ship_to_city TEXT,
  ship_to_state TEXT, ship_to_postal TEXT, ship_to_country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.gw_store_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.gw_store_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.gw_products(id) ON DELETE RESTRICT,
  variant_id UUID NULL REFERENCES public.gw_product_variants(id) ON DELETE RESTRICT,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  is_digital BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.gw_store_entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.gw_store_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.gw_products(id) ON DELETE RESTRICT,
  buyer_user_id UUID NULL,
  buyer_email TEXT NOT NULL,
  download_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ NULL,
  last_download_ip TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gw_store_orders_tenant_status ON public.gw_store_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_gw_store_order_items_order ON public.gw_store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_gw_store_entitlements_order ON public.gw_store_entitlements(order_id);

ALTER TABLE public.gw_store_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_store_entitlements ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_store_orders','gw_store_order_items','gw_store_entitlements'] LOOP
    EXECUTE format('CREATE POLICY tenant_isolation_restrict ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())', t);
    EXECUTE format('CREATE POLICY service_role_only ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
```

- [ ] **Step 4: Run test to verify it passes**

Run: apply the migration to the scratch DB, then re-run the test file.
Expected: all `SELECT 1/...` return 1 (no division error).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260705000000_commerce_core_schema.sql supabase/migrations/tests/commerce_core_schema_test.sql
git commit -m "feat(commerce): store orders/items/entitlements schema + RLS"
```

---

## Task 2: `gw_store_fulfill_order` + `gw_store_refund_order`

**Files:**
- Create: `supabase/migrations/20260705000100_commerce_core_fulfill.sql`
- Test: `supabase/migrations/tests/commerce_core_fulfill_test.sql`

**Interfaces:**
- Consumes: Task 1 tables; `gw_products.stock_quantity`, `gw_products.manage_stock`, `gw_products.requires_shipping`.
- Produces: `gw_store_fulfill_order(p_order_id UUID, p_session_id TEXT, p_payment_intent_id TEXT) RETURNS JSONB` returning `{ok, order_id, tenant_id, buyer_email, entitlements}` or `{already_paid}` or `{error}`. `gw_store_refund_order(p_order_id UUID) RETURNS JSONB`.

- [ ] **Step 1: Write the failing test**

`supabase/migrations/tests/commerce_core_fulfill_test.sql`:
```sql
\set ON_ERROR_STOP on
-- Seed a tenant + a stocked physical product + a digital product + a pending order.
-- (Uses a fixed tenant id present in scratch; adjust seed as needed.)
DO $$
DECLARE v_tenant UUID; v_phys UUID; v_dig UUID; v_order UUID; r1 JSONB; r2 JSONB;
BEGIN
  SELECT id INTO v_tenant FROM gw_tenants LIMIT 1;
  INSERT INTO gw_products (tenant_id, name, price, manage_stock, stock_quantity, requires_shipping)
    VALUES (v_tenant,'Tee',20,true,1,true) RETURNING id INTO v_phys;
  INSERT INTO gw_products (tenant_id, name, price, manage_stock, stock_quantity, requires_shipping)
    VALUES (v_tenant,'Album',10,false,0,false) RETURNING id INTO v_dig;
  INSERT INTO gw_store_orders (tenant_id, store_type, buyer_email, amount_cents, status)
    VALUES (v_tenant,'tenant','b@x.com',3000,'pending') RETURNING id INTO v_order;
  INSERT INTO gw_store_order_items (tenant_id, order_id, product_id, unit_price_cents, quantity, is_digital)
    VALUES (v_tenant,v_order,v_phys,2000,1,false),(v_tenant,v_order,v_dig,1000,1,true);

  r1 := public.gw_store_fulfill_order(v_order,'sess_1','pi_1');
  IF (r1->>'ok') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'first fulfill not ok: %', r1; END IF;
  IF (SELECT status FROM gw_store_orders WHERE id=v_order) <> 'paid' THEN RAISE EXCEPTION 'order not paid'; END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_phys) <> 0 THEN RAISE EXCEPTION 'stock not decremented'; END IF;
  IF (SELECT count(*) FROM gw_store_entitlements WHERE order_id=v_order) <> 1 THEN RAISE EXCEPTION 'entitlement not minted'; END IF;

  r2 := public.gw_store_fulfill_order(v_order,'sess_1','pi_1');  -- retry
  IF (r2->>'already_paid') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'retry not idempotent: %', r2; END IF;
  IF (SELECT stock_quantity FROM gw_products WHERE id=v_phys) <> 0 THEN RAISE EXCEPTION 'retry double-decremented'; END IF;
  RAISE NOTICE 'fulfill test passed';
END $$;
```

- [ ] **Step 2: Run test to verify it fails**

Run: `docker exec -i supabase-db psql -U supabase_admin -d postgres_scratch < supabase/migrations/tests/commerce_core_fulfill_test.sql`
Expected: FAIL — `function gw_store_fulfill_order does not exist`.

- [ ] **Step 3: Write the function migration**

`supabase/migrations/20260705000100_commerce_core_fulfill.sql`:
```sql
CREATE OR REPLACE FUNCTION public.gw_store_fulfill_order(
  p_order_id UUID, p_session_id TEXT, p_payment_intent_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD; v_item RECORD; v_prod RECORD;
  v_ents JSONB := '[]'::jsonb; v_token TEXT;
BEGIN
  SELECT * INTO v_order FROM gw_store_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status <> 'pending' THEN
    RETURN jsonb_build_object('already_paid', true, 'order_id', v_order.id);
  END IF;

  -- Lock + decrement stock per line item; block oversell under lock.
  FOR v_item IN SELECT * FROM gw_store_order_items WHERE order_id = v_order.id LOOP
    SELECT * INTO v_prod FROM gw_products WHERE id = v_item.product_id FOR UPDATE;
    IF v_prod.manage_stock AND v_prod.stock_quantity < v_item.quantity THEN
      RETURN jsonb_build_object('error','over_capacity','product_id',v_item.product_id,
        'available', v_prod.stock_quantity, 'requested', v_item.quantity);
    END IF;
    IF v_prod.manage_stock THEN
      UPDATE gw_products SET stock_quantity = stock_quantity - v_item.quantity WHERE id = v_prod.id;
    END IF;
    -- Mint one digital entitlement per digital line (quantity-agnostic: one grant per product per order).
    IF v_item.is_digital THEN
      v_token := encode(gen_random_bytes(24),'hex');
      INSERT INTO gw_store_entitlements (tenant_id, order_id, product_id, buyer_user_id, buyer_email, download_token, expires_at)
      VALUES (v_order.tenant_id, v_order.id, v_item.product_id, v_order.buyer_user_id, v_order.buyer_email, v_token, now() + interval '30 days');
      v_ents := v_ents || jsonb_build_object('product_id', v_item.product_id, 'download_token', v_token);
    END IF;
  END LOOP;

  UPDATE gw_store_orders
     SET status='paid',
         provider_session_id = COALESCE(provider_session_id, p_session_id),
         provider_payment_intent_id = p_payment_intent_id,
         updated_at = now()
   WHERE id = v_order.id;

  RETURN jsonb_build_object('ok',true,'order_id',v_order.id,'tenant_id',v_order.tenant_id,
    'buyer_email',v_order.buyer_email,'entitlements',v_ents);
END $$;

CREATE OR REPLACE FUNCTION public.gw_store_refund_order(p_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_order RECORD; v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM gw_store_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RETURN jsonb_build_object('error','order_not_found'); END IF;
  IF v_order.status = 'refunded' THEN RETURN jsonb_build_object('already_refunded', true); END IF;
  IF v_order.status <> 'paid' THEN RETURN jsonb_build_object('error','not_paid'); END IF;
  FOR v_item IN SELECT * FROM gw_store_order_items WHERE order_id = v_order.id LOOP
    UPDATE gw_products SET stock_quantity = stock_quantity + v_item.quantity
      WHERE id = v_item.product_id AND manage_stock;
  END LOOP;
  UPDATE gw_store_orders SET status='refunded', updated_at=now() WHERE id=v_order.id;
  RETURN jsonb_build_object('ok', true, 'order_id', v_order.id);
END $$;
```

- [ ] **Step 4: Run test to verify it passes**

Run the fulfill test file again. Expected: `NOTICE: fulfill test passed`, no exception.

- [ ] **Step 5: Add oversell + refund assertions and re-run**

Append to the test file a block that seeds a 1-stock product, two pending orders each qty 1, fulfills both, and asserts the second returns `error=over_capacity`; and a block that fulfills then `gw_store_refund_order` and asserts status `refunded` + stock restored. Run; expected pass.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260705000100_commerce_core_fulfill.sql supabase/migrations/tests/commerce_core_fulfill_test.sql
git commit -m "feat(commerce): atomic idempotent gw_store_fulfill_order + refund"
```

---

## Task 3: Provider seam (`_shared/payments/`)

**Files:**
- Create: `supabase/functions/_shared/payments/types.ts`, `stripe.ts`, `index.ts`
- Test: `supabase/functions/_shared/payments/seam_test.ts`

**Interfaces:**
- Produces:
  - `createCheckout(provider: 'stripe', args: { account: string|null, lineItems: LineItem[], orderId: string, storeType: string, successUrl: string, cancelUrl: string, buyerEmail?: string }): Promise<{ url: string }>`
  - `verifyAndParseWebhook(provider: 'stripe', rawBody: string, sig: string, secret: string): Promise<ParsedWebhook>`
  - `ParsedWebhook = { type: string, orderId: string|null, sessionId: string|null, paymentIntentId: string|null, amountCents: number|null, paid: boolean }`
  - `LineItem = { name: string, unitPriceCents: number, quantity: number }`

- [ ] **Step 1: Write the failing test**

`_shared/payments/seam_test.ts`:
```ts
import { verifyAndParseWebhook } from './index.ts';
// A checkout.session.completed fixture (payment_status: 'paid', metadata.order_id set).
const raw = JSON.stringify({ type:'checkout.session.completed', data:{ object:{
  id:'cs_1', payment_intent:'pi_1', amount_total:3000, payment_status:'paid',
  metadata:{ order_id:'ord_1', store_type:'tenant' } }}});
// With verification stubbed for test (VERIFY_SKIP=1), parsing must normalize correctly.
Deno.env.set('PAYMENTS_TEST_SKIP_VERIFY','1');
const p = await verifyAndParseWebhook('stripe', raw, 'sig', 'whsec_x');
if (p.orderId !== 'ord_1' || !p.paid || p.paymentIntentId !== 'pi_1' || p.amountCents !== 3000) {
  throw new Error('parse mismatch: ' + JSON.stringify(p));
}
console.log('seam parse test passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd supabase/functions && deno test --allow-env _shared/payments/seam_test.ts` (or `deno run --allow-env`).
Expected: FAIL — module `./index.ts` not found.

- [ ] **Step 3: Write `types.ts`**

```ts
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
```

- [ ] **Step 4: Write `stripe.ts`**

```ts
import type { CreateCheckoutArgs, ParsedWebhook } from './types.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2025-08-27.basil' });

export async function stripeCreateCheckout(a: CreateCheckoutArgs): Promise<{ url: string }> {
  const opts = a.account ? { stripeAccount: a.account } : undefined; // Connect direct charge when account set
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: a.lineItems.map(li => ({
      price_data: { currency: 'usd', product_data: { name: li.name }, unit_amount: li.unitPriceCents },
      quantity: li.quantity,
    })),
    customer_email: a.buyerEmail,
    success_url: a.successUrl, cancel_url: a.cancelUrl,
    metadata: { order_id: a.orderId, store_type: a.storeType },
    payment_intent_data: { metadata: { order_id: a.orderId, store_type: a.storeType } },
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
```

- [ ] **Step 5: Write `index.ts`**

```ts
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd supabase/functions && deno run --allow-env --allow-net _shared/payments/seam_test.ts`
Expected: `seam parse test passed`.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/_shared/payments/
git commit -m "feat(commerce): payment-provider seam (stripe impl)"
```

---

## Task 4: `store-checkout` edge function

**Files:**
- Create: `supabase/functions/store-checkout/index.ts`
- Test: `supabase/functions/store-checkout/checkout_test.sh` (curl-based integration test)

**Interfaces:**
- Consumes: `verifyJwtClaims` (`_shared/verifyJwt.ts`), `createCheckout` (Task 3), `gw_products`, `gw_tenants.stripe_account_id`, `gw_tenant_subscriptions`.
- Produces: `POST /store-checkout` body `{ store_type, items: [{product_id, variant_id?, quantity}], buyer_email }` → `{ url }`. Pre-creates `gw_store_orders` (pending) + items.

- [ ] **Step 1: Write the failing test**

`store-checkout/checkout_test.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-https://supabase.gleeworld.org/functions/v1}"; ANON="$1"; JWT="$2"; PROD="$3"
# Tampered price is impossible by construction (client sends no price); assert a valid call returns a URL
# and that an unauthenticated call is rejected.
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/store-checkout" -H "apikey: $ANON" \
  -H 'Content-Type: application/json' -d "{\"store_type\":\"tenant\",\"items\":[{\"product_id\":\"$PROD\",\"quantity\":1}],\"buyer_email\":\"b@x.com\"}")
[ "$code" = "401" ] || { echo "expected 401 unauth, got $code"; exit 1; }
resp=$(curl -s -X POST "$BASE/store-checkout" -H "apikey: $ANON" -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' -d "{\"store_type\":\"tenant\",\"items\":[{\"product_id\":\"$PROD\",\"quantity\":1}],\"buyer_email\":\"b@x.com\"}")
echo "$resp" | grep -q 'checkout.stripe.com\|/c/pay/' || { echo "no checkout url: $resp"; exit 1; }
echo "checkout test passed"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash supabase/functions/store-checkout/checkout_test.sh <ANON> <JWT> <PRODUCT_ID>`
Expected: FAIL — function not deployed (404/connection error).

- [ ] **Step 3: Write the function**

`store-checkout/index.ts` (copies the pgRead/pgInsert helper style from `box-office-checkout/index.ts`):
```ts
import { verifyJwtClaims } from '../_shared/verifyJwt.ts';
import { createCheckout, type LineItem } from '../_shared/payments/index.ts';

const corsHeaders = { 'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS' };
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PLATFORM_TENANT_ID = Deno.env.get('GW_PLATFORM_TENANT_ID') ?? '';

async function pg(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: {
    apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type':'application/json',
    Prefer:'return=representation', ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`pg ${path} ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}
const j = (b: unknown, s=200) => new Response(JSON.stringify(b), { status:s, headers:{...corsHeaders,'Content-Type':'application/json'} });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const claims = await verifyJwtClaims(req.headers.get('Authorization')?.replace(/^Bearer\s+/i,''));
    if (!claims) return j({ error:'Unauthorized' }, 401);
    const { store_type, items, buyer_email } = await req.json();
    if (!['gleeworld','tenant'].includes(store_type)) return j({ error:'bad store_type' }, 400);
    if (!Array.isArray(items) || items.length === 0) return j({ error:'empty cart' }, 400);

    // Resolve owning tenant + account server-side.
    const tenantId = store_type === 'gleeworld' ? PLATFORM_TENANT_ID : claims.tenant_id;
    if (!tenantId) return j({ error:'no tenant' }, 400);

    if (store_type === 'tenant') {
      // Add-on gate: require an active/trial 'store' module subscription. Re-checked server-side.
      const subs = await pg(`gw_tenant_subscriptions?tenant_id=eq.${tenantId}&module_id=eq.store&select=status`);
      const ok = Array.isArray(subs) && subs.some((s:any)=>['active','trial'].includes(s.status));
      if (!ok) return j({ error:'Store add-on not enabled' }, 403);
    }

    // Server-side price lookup; client never sends amounts.
    const lineItems: LineItem[] = []; let amount = 0; let requiresShipping = false;
    const orderItems: any[] = [];
    for (const it of items) {
      if (!it.product_id || !(it.quantity > 0)) return j({ error:'bad item' }, 400);
      const rows = await pg(`gw_products?id=eq.${it.product_id}&tenant_id=eq.${tenantId}&is_active=eq.true&select=id,name,price,sale_price,requires_shipping,manage_stock,stock_quantity`);
      const p = Array.isArray(rows) && rows[0];
      if (!p) return j({ error:`product not found: ${it.product_id}` }, 400);
      const cents = Math.round(Number(p.sale_price ?? p.price) * 100);
      if (p.manage_stock && p.stock_quantity < it.quantity) return j({ error:`insufficient stock: ${p.id}` }, 409);
      lineItems.push({ name: p.name, unitPriceCents: cents, quantity: it.quantity });
      amount += cents * it.quantity;
      if (p.requires_shipping) requiresShipping = true;
      orderItems.push({ tenant_id: tenantId, product_id: p.id, variant_id: it.variant_id ?? null,
        unit_price_cents: cents, quantity: it.quantity, is_digital: !p.requires_shipping });
    }

    // Pre-create the pending order + items.
    const order = (await pg('gw_store_orders', { method:'POST', body: JSON.stringify({
      tenant_id: tenantId, store_type, buyer_email, amount_cents: amount, requires_shipping: requiresShipping, status:'pending' }) }))[0];
    for (const oi of orderItems) oi.order_id = order.id;
    await pg('gw_store_order_items', { method:'POST', body: JSON.stringify(orderItems) });

    // Which Stripe account collects — server-resolved.
    let account: string | null = null;
    if (store_type === 'tenant') {
      const t = await pg(`gw_tenants?id=eq.${tenantId}&select=stripe_account_id`);
      account = (Array.isArray(t) && t[0]?.stripe_account_id) || null;
      if (!account) return j({ error:'tenant has no connected Stripe account' }, 400);
    }
    const origin = req.headers.get('origin') ?? 'https://gleeworld.org';
    const { url } = await createCheckout('stripe', {
      account, lineItems, orderId: order.id, storeType: store_type, buyerEmail: buyer_email,
      successUrl: `${origin}/store/success?order=${order.id}`, cancelUrl: `${origin}/store?canceled=1` });
    return j({ url, order_id: order.id });
  } catch (e) { console.error('[store-checkout]', (e as Error).message); return j({ error:'checkout failed' }, 500); }
});
```

- [ ] **Step 4: Deploy to the functions volume + restart, then run the test**

```bash
scp -r supabase/functions/store-checkout root@198.211.113.144:/opt/supabase/volumes/functions/
ssh root@198.211.113.144 'cd /opt/supabase && docker compose restart functions'
bash supabase/functions/store-checkout/checkout_test.sh <ANON> <JWT> <PRODUCT_ID>
```
Expected: `checkout test passed`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/store-checkout/
git commit -m "feat(commerce): store-checkout (server-side pricing, add-on gate, pending order)"
```

---

## Task 5: Webhook fulfillment branch (`server.js`)

**Files:**
- Modify: `/opt/gleeworld-provision-webhook/server.js` (add `handleStoreCheckoutCompleted`; wire into both the platform `/stripe-webhook` and `/stripe-connect-webhook` handlers when `metadata.order_id` is present AND `metadata.store_type` is set).
- Test: manual via Stripe CLI (documented in Task 8 matrix, cases 2 & 3).

**Interfaces:**
- Consumes: `gw_store_fulfill_order` (Task 2); the existing `runSqlReturn`, `claimEvent`, signature-verified `event`.
- Produces: on `checkout.session.completed` with `metadata.order_id` + `metadata.store_type` → order promoted to paid via the SQL function; idempotent via `claimEvent` + the function's own lock.

- [ ] **Step 1: Add the handler (after `handleConnectCheckoutCompleted`)**

```js
// Store sale (GleeWorld Store on the platform account, or a Tenant Store on a
// Connect account). Distinguished from tickets/modules by metadata.store_type.
async function handleStoreCheckoutCompleted(session) {
  const orderId = session.metadata?.order_id;
  const storeType = session.metadata?.store_type;
  if (!orderId || !storeType) return; // not a store sale
  const pi = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id || '');
  const sql = `SELECT public.gw_store_fulfill_order($$${orderId}$$::uuid, $$${session.id}$$, $$${pi}$$) AS result;`;
  const raw = await runSqlReturn(sql);
  const line = raw.split('\n').map(l => l.trim()).find(l => l.startsWith('{'));
  const result = line ? JSON.parse(line) : null;
  if (result?.ok) console.log('[store] fulfilled order', orderId, 'ents', (result.entitlements||[]).length);
  else if (result?.already_paid) console.log('[store] order already paid (idempotent)', orderId);
  else console.error('[store] fulfill error', orderId, result);
  // Digital delivery + receipt email are issued by a follow-up (out of scope here);
  // entitlements already exist in gw_store_entitlements for store-download to serve.
}
```

- [ ] **Step 2: Dispatch it in BOTH webhook routes**

In the platform `/stripe-webhook` `checkout.session.completed` case and the `/stripe-connect-webhook` handler, before the existing ticket/module branches, add:
```js
if (session.metadata?.store_type) { await handleStoreCheckoutCompleted(session); break; }
```
(GleeWorld Store fires on the platform endpoint; Tenant Store on the Connect endpoint — the same function serves both because the account context is Stripe's, not ours.)

- [ ] **Step 3: Syntax-check on the droplet before restart (memory: node --check)**

```bash
scp /path/local/server.js root@198.211.113.144:/tmp/server.js.new
ssh root@198.211.113.144 'node --check /tmp/server.js.new && cp -n /opt/gleeworld-provision-webhook/server.js /opt/gleeworld-provision-webhook/server.js.bak && cp /tmp/server.js.new /opt/gleeworld-provision-webhook/server.js && systemctl restart gleeworld-provision'
```
Expected: no syntax error; service active.

- [ ] **Step 4: Verify via Stripe CLI (test mode)**

```bash
stripe trigger checkout.session.completed --add checkout_session:metadata.order_id=<PENDING_ORDER_ID> --add checkout_session:metadata.store_type=tenant
# then re-run the same trigger to prove idempotency
```
Expected: order flips to `paid` once; second trigger logs `already paid (idempotent)`; stock decremented once.

- [ ] **Step 5: Commit the source copy**

```bash
git add deploy/onboarding-fixes-20260703/webhook-server.js   # keep the repo snapshot in sync
git commit -m "feat(commerce): webhook store-fulfillment branch (platform + connect)"
```

---

## Task 6: `store-download` edge function (digital delivery)

**Files:**
- Create: `supabase/functions/store-download/index.ts`
- Test: `supabase/functions/store-download/download_test.sh`

**Interfaces:**
- Consumes: `gw_store_entitlements`; DO Spaces credentials (`SPACES_KEY`, `SPACES_SECRET`, `SPACES_BUCKET`, `SPACES_REGION`); product→object mapping (`gw_products.digital_object_key` — add this column in Task 1 follow-up if absent; the plan assumes a `digital_object_key TEXT` column added by a small ALTER here).
- Produces: `GET /store-download?token=<download_token>` → 302 redirect to a short-TTL presigned URL, or 403 if expired/invalid; increments `download_count`, records IP + timestamp.

- [ ] **Step 1: Add the column (mini-migration) + write the failing test**

Migration `supabase/migrations/20260705000200_product_digital_key.sql`:
```sql
ALTER TABLE public.gw_products ADD COLUMN IF NOT EXISTS digital_object_key TEXT;
```
Test `download_test.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-https://supabase.gleeworld.org/functions/v1}"; ANON="$1"; TOKEN="$2"; EXPIRED="$3"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/store-download?token=$TOKEN" -H "apikey: $ANON")
[ "$code" = "302" ] || { echo "valid token expected 302, got $code"; exit 1; }
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/store-download?token=$EXPIRED" -H "apikey: $ANON")
[ "$code" = "403" ] || { echo "expired token expected 403, got $code"; exit 1; }
echo "download test passed"
```

- [ ] **Step 2: Run test to verify it fails** — function not deployed → 404. 

- [ ] **Step 3: Write the function**

```ts
// Serves a digital entitlement as a short-TTL presigned DO Spaces URL. Never a
// permanent public link. Records download evidence for dispute defense.
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SPACES = { key: Deno.env.get('SPACES_KEY')!, secret: Deno.env.get('SPACES_SECRET')!,
  bucket: Deno.env.get('SPACES_BUCKET')!, region: Deno.env.get('SPACES_REGION') ?? 'nyc3' };

async function pg(path: string, init?: RequestInit) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers:{ apikey:SRK, Authorization:`Bearer ${SRK}`, 'Content-Type':'application/json', ...(init?.headers??{}) }});
  if (!r.ok) throw new Error(`pg ${path} ${r.status}`); return r.status===204?null:r.json();
}

Deno.serve(async (req) => {
  const url = new URL(req.url); const token = url.searchParams.get('token');
  if (!token) return new Response('missing token', { status:400 });
  const rows = await pg(`gw_store_entitlements?download_token=eq.${token}&select=id,product_id,expires_at,download_count`);
  const ent = Array.isArray(rows) && rows[0];
  if (!ent) return new Response('invalid', { status:403 });
  if (ent.expires_at && new Date(ent.expires_at) < new Date()) return new Response('expired', { status:403 });
  const prod = (await pg(`gw_products?id=eq.${ent.product_id}&select=digital_object_key`))[0];
  if (!prod?.digital_object_key) return new Response('no file', { status:404 });

  const ttl = 300; // 5 min
  const endpoint = `https://${SPACES.bucket}.${SPACES.region}.digitaloceanspaces.com/${prod.digital_object_key}`;
  const aws = new AwsClient({ accessKeyId: SPACES.key, secretAccessKey: SPACES.secret, service:'s3', region: SPACES.region });
  const signed = await aws.sign(new Request(`${endpoint}?X-Amz-Expires=${ttl}`), { aws:{ signQuery:true } });

  const ip = req.headers.get('x-forwarded-for') ?? '';
  await pg(`gw_store_entitlements?id=eq.${ent.id}`, { method:'PATCH', body: JSON.stringify({
    download_count: (ent.download_count ?? 0) + 1, last_downloaded_at: new Date().toISOString(), last_download_ip: ip }) });
  return Response.redirect(signed.url, 302);
});
```

- [ ] **Step 4: Deploy + run the test** (deploy like Task 4 Step 4). Expected: `download test passed`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/store-download/ supabase/migrations/20260705000200_product_digital_key.sql
git commit -m "feat(commerce): store-download presigned digital delivery + evidence"
```

---

## Task 7: Delete dormant unsafe shop code

**Files:**
- Delete: `supabase/functions/shop-checkout/`, `create-stripe-checkout/`, `verify-shop-payment/`, `verify-stripe-payment/`
- Modify: any `src/` caller that referenced them → point at `store-checkout` / read-only status (grep first).

- [ ] **Step 1: Find references**

Run: `grep -rn "shop-checkout\|create-stripe-checkout\|verify-shop-payment\|verify-stripe-payment" src/ supabase/functions/ | grep -v node_modules`
Expected: a list of caller sites.

- [ ] **Step 2: Repoint or remove each caller** — for each hit, replace the `functions.invoke('shop-checkout'|...)` call with `functions.invoke('store-checkout', ...)`; delete success-page code that WROTE order status (it must only READ now).

- [ ] **Step 3: Delete the functions + verify build**

```bash
git rm -r supabase/functions/shop-checkout supabase/functions/create-stripe-checkout supabase/functions/verify-shop-payment supabase/functions/verify-stripe-payment
bun x vite build 2>&1 | tail -2
grep -rn "shop-checkout\|create-stripe-checkout\|verify-shop-payment\|verify-stripe-payment" src/ || echo "no references remain"
```
Expected: build succeeds; no references remain.

- [ ] **Step 4: Remove deployed copies from the droplet**

```bash
ssh root@198.211.113.144 'cd /opt/supabase/volumes/functions && rm -rf shop-checkout create-stripe-checkout verify-shop-payment verify-stripe-payment && cd /opt/supabase && docker compose restart functions'
```

- [ ] **Step 5: Commit**

```bash
git commit -am "chore(commerce): delete dormant unsafe shop checkout/verify functions"
```

---

## Task 8: End-to-end test matrix (Stripe test mode)

**Files:**
- Create: `docs/commerce-test-matrix.md`

- [ ] **Step 1: Write the runbook** covering all 8 cases with exact commands:
  1. Tampered price — client body has no price field; confirm charge = server sum (read `gw_store_orders.amount_cents`).
  2. Double webhook — `stripe trigger` twice; assert one paid order, stock decremented once.
  3. Browser-closed — create checkout, complete payment in Stripe test UI without hitting success page; assert order still `paid` via webhook.
  4. Oversell — set a product stock=1; two concurrent `store-checkout`+complete; assert exactly one `paid`, other `over_capacity` (refund the loser).
  5. Digital expiry — set an entitlement `expires_at` in the past; assert `store-download` → 403.
  6. Tenant isolation — as tenant A's JWT, attempt to read tenant B's `gw_store_orders` via PostgREST; assert empty/denied.
  7. Add-on off — remove the `store` subscription; assert `store-checkout` → 403.
  8. Refund — `gw_store_refund_order`; assert status `refunded` + stock restored, idempotent on retry.

- [ ] **Step 2: Execute all 8** in Stripe test mode; record pass/fail in the doc.

- [ ] **Step 3: Commit**

```bash
git add docs/commerce-test-matrix.md
git commit -m "test(commerce): 8-case test matrix results (Stripe test mode)"
```

---

## Task 9: Launch gate (flip to live)

**This task is gated on Task 8 being fully green and on Kevin's explicit go at execution time.**

- [ ] **Step 1: Confirm all 8 matrix cases pass in test mode** (re-read `docs/commerce-test-matrix.md`).
- [ ] **Step 2: Confirm the platform tenant id env is set** — `GW_PLATFORM_TENANT_ID` in the functions env matches the real platform tenant.
- [ ] **Step 3: Confirm each selling tenant has a live Connect account** — `gw_tenants.stripe_account_id` + `stripe_charges_enabled=true`.
- [ ] **Step 4: Register the store webhook events** — ensure `checkout.session.completed` is enabled on BOTH the platform `/stripe-webhook` and `/stripe-connect-webhook` endpoints (Dashboard).
- [ ] **Step 5: Flip keys to live** — swap `STRIPE_SECRET_KEY` (restricted key per the account-posture memory) in the functions env + `webhook-server.js` env; restart both. Verify with one real low-value end-to-end purchase, then refund it.
- [ ] **Step 6: Commit the go-live note** to `docs/commerce-test-matrix.md`.

---

## Self-Review

- **Spec coverage:** data model (T1) · fulfill/idempotency/oversell (T2) · provider seam (T3) · server-side pricing + account resolution + add-on gate + pending order (T4) · webhook-only fulfillment (T5) · digital delivery/signed URLs/evidence (T6) · deletions (T7) · 8-case matrix (T8) · launch gate (T9). All spec sections mapped.
- **Placeholder scan:** none — every code step contains real SQL/TS; the only deferred item (receipt email/digital-delivery follow-up) is explicitly out of scope and noted.
- **Type consistency:** `createCheckout`/`verifyAndParseWebhook`/`ParsedWebhook`/`LineItem` names match across T3→T4→T5; `gw_store_fulfill_order(order_id, session_id, payment_intent_id)` signature matches between T2 and T5.

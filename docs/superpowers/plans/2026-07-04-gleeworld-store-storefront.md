# GleeWorld Store Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the customer-facing GleeWorld Store (browse → guest checkout → success → digital delivery) plus admin + reconciliation, rewired onto the live Commerce Core.

**Architecture:** Reuse the dormant storefront/admin UI; repoint it from the deleted `shop-checkout`/`verify-*` to the Core's `store-checkout` + `gw_store_orders`. Add a guest path + rate limiting to `store-checkout`, a token-gated `store-order-status`, an admin `store-refund`, a public catalog RPC, and a pending-order sweep.

**Tech Stack:** React 18 + Vite + shadcn (per `gleeworld-design`), Deno edge functions (raw-fetch/PostgREST style), Postgres/PL-pgSQL, Stripe (platform account), DO Spaces.

## Global Constraints

- Guest checkout is `store_type='gleeworld'` ONLY; `store_type='tenant'` keeps its JWT + add-on gate unchanged.
- Prices are server-side from `gw_products`; client sends `{product_id, variant_id?, quantity}` only.
- Order status to a guest is exposed ONLY via `access_token` match — never by order id alone (no IDOR).
- Catalog is public ONLY via the `gw_store_list_products()` SECURITY DEFINER RPC; no anon RLS policy on `gw_products`; money tables stay service-role-only.
- Amounts integer cents; platform tenant id `bb48609d-a1ca-4905-be50-b84afdac187e`.
- Local tests: scratch DB `commerce_scratch` via `/opt/homebrew/opt/postgresql@16/bin/psql`; Deno via `deno run --allow-env --allow-net`. NEVER test against prod.
- No `stripe.*` outside `_shared/payments/`.
- Reference implementations: the Core's `store-checkout/index.ts`, `store-download/index.ts`, `_shared/verifyJwt.ts`, `_shared/auth.ts`, `gw_store_fulfill_order`, and `box-office-*` for the `access_token` pattern.

---

## File Structure

- `supabase/migrations/20260706000000_store_storefront_schema.sql` — new: `access_token` col, `gw_store_checkout_attempts` table, `gw_store_list_products()` RPC.
- `supabase/functions/store-checkout/index.ts` — modify: guest path, rate limit, mint + return `access_token`.
- `supabase/functions/store-order-status/index.ts` — new.
- `supabase/functions/store-refund/index.ts` — new.
- `supabase/functions/store-reconcile/index.ts` — new (invoked by pg_cron).
- `src/features/store/cart.ts` — new: localStorage cart.
- `src/pages/Shop.tsx` — modify: catalog via RPC.
- `src/pages/CheckoutPage.tsx` — modify: call `store-checkout`.
- `src/pages/StoreSuccess.tsx` — new: `/store/success`.
- `src/App.tsx` — modify: add `/store/success` route.
- Admin: `src/components/products/ProductManager.tsx`, `OrdersManager.tsx` — modify to new tables.
- Delete: `supabase/functions/{shop-checkout,create-stripe-checkout,verify-shop-payment,verify-stripe-payment}/`; repoint `src/pages/{Checkout.tsx,CheckoutPage.tsx,OrderConfirmation.tsx,shop/Success.tsx}`.

---

## Task 1: Storefront schema (access_token, rate-limit table, catalog RPC)

**Files:** Create `supabase/migrations/20260706000000_store_storefront_schema.sql`; Test `supabase/migrations/tests/store_storefront_schema_test.sql`

**Interfaces:**
- Produces: `gw_store_orders.access_token TEXT UNIQUE`; table `gw_store_checkout_attempts(id, ip TEXT, email TEXT, created_at)`; function `gw_store_list_products() RETURNS TABLE(id uuid, name text, price numeric, sale_price numeric, requires_shipping boolean, images text[], description text)`.

- [ ] **Step 1: Write the failing test**

`store_storefront_schema_test.sql`:
```sql
\set ON_ERROR_STOP on
SELECT 1/(CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='gw_store_orders' AND column_name='access_token') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN to_regclass('public.gw_store_checkout_attempts') IS NOT NULL THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN to_regprocedure('public.gw_store_list_products()') IS NOT NULL THEN 1 ELSE 0 END);
-- RPC returns only active platform-tenant products
DO $$ DECLARE n int; BEGIN
  INSERT INTO gw_products (tenant_id,name,title,price,is_active) VALUES ('bb48609d-a1ca-4905-be50-b84afdac187e','Live','Live',10,true),('bb48609d-a1ca-4905-be50-b84afdac187e','Dead','Dead',10,false);
  SELECT count(*) INTO n FROM gw_store_list_products() WHERE name='Dead';
  IF n <> 0 THEN RAISE EXCEPTION 'RPC leaked inactive product'; END IF;
END $$;
```

- [ ] **Step 2: Run to verify RED**

Run: `/opt/homebrew/opt/postgresql@16/bin/psql -d commerce_scratch -v ON_ERROR_STOP=1 -f supabase/migrations/tests/store_storefront_schema_test.sql`
Expected: FAIL (column/table/function absent → division by zero). (Scratch DB seeded platform tenant id may differ; adjust the seed tenant id to an existing `gw_tenants.id` in scratch and note it.)

- [ ] **Step 3: Write the migration**

```sql
ALTER TABLE public.gw_store_orders ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS public.gw_store_checkout_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT, email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gw_store_attempts_ip ON public.gw_store_checkout_attempts(ip, created_at);
CREATE INDEX IF NOT EXISTS idx_gw_store_attempts_email ON public.gw_store_checkout_attempts(email, created_at);
ALTER TABLE public.gw_store_checkout_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_only ON public.gw_store_checkout_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.gw_store_list_products()
RETURNS TABLE(id uuid, name text, price numeric, sale_price numeric, requires_shipping boolean, images text[], description text)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name, p.price, p.sale_price, p.requires_shipping, p.images, p.description
  FROM public.gw_products p
  WHERE p.tenant_id = 'bb48609d-a1ca-4905-be50-b84afdac187e' AND p.is_active = true
  ORDER BY p.is_featured DESC NULLS LAST, p.name;
$$;
REVOKE ALL ON FUNCTION public.gw_store_list_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_store_list_products() TO anon, authenticated, service_role;
```

- [ ] **Step 4: Run to verify GREEN** — re-apply + re-run the test file; all assertions return 1, no exception.
- [ ] **Step 5: Commit** — `git add supabase/migrations/20260706000000_store_storefront_schema.sql supabase/migrations/tests/store_storefront_schema_test.sql && git commit -m "feat(store): storefront schema — access_token, rate-limit table, catalog RPC"`

---

## Task 2: `store-checkout` guest path + rate limit + access_token

**Files:** Modify `supabase/functions/store-checkout/index.ts`; Test `supabase/functions/store-checkout/guest_test.ts`

**Interfaces:**
- Consumes: Task 1 schema.
- Produces: `store-checkout` accepts `store_type='gleeworld'` with NO auth (guest); returns `{ url, order_id, access_token }`; rate-limits per ip+email.

- [ ] **Step 1: Write the failing test** — `guest_test.ts` (stub `globalThis.fetch`): (a) no Authorization + `store_type='gleeworld'` → 200 with `access_token` present and server-computed `amount_cents`; (b) `store_type='tenant'` with no auth → 401; (c) 6th attempt from same ip within window → 429; (d) with a JWT, `buyer_user_id` set. Run: `cd supabase/functions && STRIPE_SECRET_KEY=sk_test_dummy deno run --allow-env --allow-net store-checkout/guest_test.ts`.

- [ ] **Step 2: Run to verify RED** — guest call currently 401s (line 55).

- [ ] **Step 3: Modify the auth gate** — replace `store-checkout/index.ts:54-65` region:
```ts
    const authHeader = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    const claims = authHeader ? await verifyJwtClaims(authHeader) : null;
    const { store_type, items, buyer_email } = await req.json();
    if (!['gleeworld', 'tenant'].includes(store_type)) return j({ error: 'bad store_type' }, 400);
    // Guest checkout allowed ONLY for the public GleeWorld store. Tenant store still requires a verified JWT.
    if (store_type === 'tenant' && !claims) return j({ error: 'Unauthorized' }, 401);
    if (!Array.isArray(items) || items.length === 0 || items.length > 20) return j({ error: 'bad cart' }, 400);
    if (!buyer_email || typeof buyer_email !== 'string' || !buyer_email.includes('@')) return j({ error: 'valid buyer_email required' }, 400);

    // Card-testing defense: rate-limit session creation per ip + email.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
    const since = new Date(Date.now() - 10*60*1000).toISOString();
    const recent = await pg(`gw_store_checkout_attempts?or=(ip.eq.${encodeURIComponent(ip)},email.eq.${encodeURIComponent(buyer_email)})&created_at=gte.${since}&select=id`);
    if (Array.isArray(recent) && recent.length >= 5) return j({ error: 'too many attempts, try again later' }, 429);
    await pg('gw_store_checkout_attempts', { method:'POST', body: JSON.stringify({ ip, email: buyer_email }) });

    const tenantId = store_type === 'gleeworld' ? PLATFORM_TENANT_ID : claims!.tenant_id;
    if (!tenantId) return j({ error: 'no tenant' }, 400);
```
Then in the `gw_store_orders` insert (line ~105) add `access_token`:
```ts
    const accessToken = crypto.getRandomValues(new Uint8Array(24)).reduce((s,b)=>s+b.toString(16).padStart(2,'0'),'');
    // ...include in the insert body: buyer_user_id: claims?.sub ?? null, access_token: accessToken
```
and change the final return to `return j({ url, order_id: order.id, access_token: accessToken });` and the success URL to `${origin}/store/success?order=${order.id}&t=${accessToken}`.

- [ ] **Step 4: Run to verify GREEN** — re-run `guest_test.ts`; all pass.
- [ ] **Step 5: Commit** — `git commit -m "feat(store): guest checkout + rate limit + access_token in store-checkout"`

---

## Task 3: `store-order-status` edge function

**Files:** Create `supabase/functions/store-order-status/index.ts`; Test `store-order-status/status_test.ts`

**Interfaces:** Produces `GET /store-order-status?order=<id>&t=<token>` → `{ status, entitlements?:[{product_id,download_token}] }` when `t` matches `gw_store_orders.access_token`; else 403.

- [ ] **Step 1: Failing test** (stub fetch): valid token → `{status:'paid', entitlements:[...]}`; wrong token → 403; missing token → 403; unknown order → 403. Run `deno run --allow-env --allow-net store-order-status/status_test.ts`.
- [ ] **Step 2: RED** — module absent.
- [ ] **Step 3: Implement** (copy pg() helper + `handler(req)` export from `store-checkout`):
```ts
Deno.serve(handler);
export async function handler(req: Request) {
  const url = new URL(req.url);
  const order = url.searchParams.get('order'); const t = url.searchParams.get('t');
  if (!order || !t) return json({ error: 'forbidden' }, 403);
  const rows = await pg(`gw_store_orders?id=eq.${encodeURIComponent(order)}&access_token=eq.${encodeURIComponent(t)}&select=status`);
  const o = Array.isArray(rows) && rows[0];
  if (!o) return json({ error: 'forbidden' }, 403);
  let ents: unknown[] = [];
  if (o.status === 'paid') {
    ents = await pg(`gw_store_entitlements?order_id=eq.${encodeURIComponent(order)}&select=product_id,download_token`) ?? [];
  }
  return json({ status: o.status, entitlements: ents });
}
```
- [ ] **Step 4: GREEN** — re-run test.
- [ ] **Step 5: Commit** — `git commit -m "feat(store): token-gated store-order-status"`

---

## Task 4: `store-refund` edge function (admin)

**Files:** Create `supabase/functions/store-refund/index.ts`; Test `store-refund/refund_test.ts`

**Interfaces:** Produces `POST /store-refund { order_id }` → admin-gated; calls Stripe refund on the order's `provider_payment_intent_id` AND `gw_store_refund_order(order_id)`; `{ ok:true }`.

- [ ] **Step 1: Failing test** (stub fetch + `authenticateCaller`): non-admin → 403; admin → issues Stripe refund (stubbed) then calls the RPC; idempotent second call. Run `deno run`.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Implement** — use `authenticateCaller` from `_shared/auth.ts` (returns `{internal,isAdmin}`); reject non-admin; read the order's `provider_payment_intent_id` via pg(); `POST https://api.stripe.com/v1/refunds` with `payment_intent` (through a small refund helper — keep the raw Stripe call minimal; NOT via the checkout seam, which only does checkout); then `pg('rpc/gw_store_refund_order', {method:'POST', body: JSON.stringify({p_order_id: order_id})})` (PostgREST RPC path). Return `{ok:true}`.
- [ ] **Step 4: GREEN.**
- [ ] **Step 5: Commit** — `git commit -m "feat(store): admin store-refund (stripe + gw_store_refund_order)"`

---

## Task 5: Cart module + storefront catalog (`/store`)

**Files:** Create `src/features/store/cart.ts`; Modify `src/pages/Shop.tsx`; Test `src/features/store/cart.test.ts`

**Interfaces:** Produces `cart`: `addItem({product_id,variant_id?,quantity})`, `removeItem`, `setQuantity`, `getItems()`, `clear()` — localStorage-backed, never stores price.

- [ ] **Step 1: Failing test** — `cart.test.ts` (vitest): add two items → getItems length 2; add same product_id+variant → quantity merges; removeItem; clear empties; **no `price` key ever stored** (assert serialized shape has only product_id/variant_id/quantity). Run: `bun run test src/features/store/cart.test.ts` (or the repo's test runner — check `package.json` scripts).
- [ ] **Step 2: RED.**
- [ ] **Step 3: Implement `cart.ts`** — localStorage key `gw_store_cart`; array of `{product_id, variant_id?: string|null, quantity}`; merge on same product+variant; guard quantity 1..99.
- [ ] **Step 4: GREEN.**
- [ ] **Step 5: Wire `Shop.tsx`** — fetch catalog via `supabase.rpc('gw_store_list_products')`; render grid with `gleeworld-design` tokens (cards `bg-card`, responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, physical/digital badge from `requires_shipping`); "Add to cart" calls `cart.addItem`. No price is sent anywhere — display price is from the RPC read only.
- [ ] **Step 6: Commit** — `git commit -m "feat(store): localStorage cart + /store catalog via RPC"`

---

## Task 6: Checkout + `/store/success`

**Files:** Modify `src/pages/CheckoutPage.tsx`; Create `src/pages/StoreSuccess.tsx`; Modify `src/App.tsx`

- [ ] **Step 1** — In `CheckoutPage.tsx`, replace the `functions.invoke('shop-checkout', …)` call (line ~342) with `supabase.functions.invoke('store-checkout', { body: { store_type:'gleeworld', items: cart.getItems(), buyer_email } })`; collect `buyer_email` (+ shipping address when any cart item `requires_shipping`); on success `window.location.href = data.url`. Guest allowed — no login required.
- [ ] **Step 2** — Create `StoreSuccess.tsx`: read `order` + `t` from query; call `store-order-status`; render "Payment confirmed" when `status==='paid'`, "Processing…" + poll every 2s (max ~5x) while `pending`; for each returned entitlement, render a `store-download?token=<download_token>` link; `cart.clear()` on paid. `gleeworld-design`, responsive.
- [ ] **Step 3** — Add route in `App.tsx`: `<Route path="/store/success" element={<StoreSuccess />} />` (public, no ProtectedRoute).
- [ ] **Step 4: Verify** — `bun x vite build` passes; manual note that live flow is smoke-tested in Task 10.
- [ ] **Step 5: Commit** — `git commit -m "feat(store): checkout via store-checkout + /store/success page"`

---

## Task 7: Admin rewire (products + orders)

**Files:** Modify `src/components/products/ProductManager.tsx`, `src/components/products/OrdersManager.tsx` (+ `OrderDetailDrawer.tsx`)

- [ ] **Step 1** — `ProductManager`: CRUD against `gw_products` (fields incl. `name/title, price, sale_price, is_active, requires_shipping, manage_stock, stock_quantity, digital_object_key, images`); a digital product sets `requires_shipping=false` + a `digital_object_key` (upload path to DO Spaces — reuse existing upload helper). Admin-gated route (existing).
- [ ] **Step 2** — `OrdersManager`/`OrderDetailDrawer`: list/read `gw_store_orders` + `gw_store_order_items` (status, buyer_email, amount_cents, shipping fields); a "Refund" action calls `store-refund` (Task 4). Remove reads of the deleted `gw_orders`/`gw_user_orders`.
- [ ] **Step 3: Verify** — `bun x vite build` passes; grep shows no remaining `gw_user_orders` reads in these files.
- [ ] **Step 4: Commit** — `git commit -m "feat(store): admin product + order management on gw_store_* tables"`

---

## Task 8: Reconciliation sweep

**Files:** Create `supabase/functions/store-reconcile/index.ts`; Migration `supabase/migrations/20260706000100_store_reconcile_cron.sql`

- [ ] **Step 1: Failing test** — `store-reconcile/reconcile_test.sql` against scratch: insert a pending order `created_at = now()-interval '3 hours'` and a fresh pending; call the sweep SQL; assert old → `failed`, fresh → `pending`.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Implement** — simplest is a SQL function invoked by `pg_cron` (no edge fn needed):
```sql
CREATE OR REPLACE FUNCTION public.gw_store_reconcile_pending() RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  WITH upd AS (
    UPDATE public.gw_store_orders SET status='failed', updated_at=now()
    WHERE status='pending' AND created_at < now() - interval '2 hours' RETURNING 1
  ) SELECT count(*)::int FROM upd;
$$;
REVOKE ALL ON FUNCTION public.gw_store_reconcile_pending() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gw_store_reconcile_pending() TO service_role;
-- schedule (pg_cron): SELECT cron.schedule('gw-store-reconcile','*/15 * * * *','SELECT public.gw_store_reconcile_pending()');
```
- [ ] **Step 4: GREEN** — run the SQL test.
- [ ] **Step 5: Commit** — `git commit -m "feat(store): orphan pending-order reconciliation sweep"`

---

## Task 9: Delete dormant unsafe shop functions + repoint remaining callers

**Files:** Delete `supabase/functions/{shop-checkout,create-stripe-checkout,verify-shop-payment,verify-stripe-payment}/`; Modify `src/pages/{Checkout.tsx,OrderConfirmation.tsx,shop/Success.tsx}`

- [ ] **Step 1** — Repoint or remove each remaining caller: `Checkout.tsx:267` (`create-stripe-checkout`) → `store-checkout`; `OrderConfirmation.tsx:53` + `shop/Success.tsx:33` (`verify-*`) → `store-order-status` (read-only). Delete any success-page code that WROTE order status.
- [ ] **Step 2** — `git rm -r` the four functions; `ssh root@… rm -rf` their deployed copies (deploy-time, gated).
- [ ] **Step 3: Verify** — `bun x vite build` passes; `grep -rn "shop-checkout\|create-stripe-checkout\|verify-shop-payment\|verify-stripe-payment" src` returns nothing.
- [ ] **Step 4: Commit** — `git commit -m "chore(store): remove dormant unsafe shop functions; repoint callers"`

---

## Task 10: Deploy + guest production smoke test (gated)

**Gated on Tasks 1–9 green + Kevin's go. Live money.**

- [ ] **Step 1** — Apply migrations `20260706000000` + `20260706000100` to prod (as `supabase_admin`); verify.
- [ ] **Step 2** — Deploy `store-checkout` (updated), `store-order-status`, `store-refund`, seam to the functions volume; `docker compose up -d functions`. Ensure `SPACES_*` env is set IF testing a digital product (physical needs none).
- [ ] **Step 3** — Schedule `gw_store_reconcile_pending` via pg_cron (verify `cron` extension present, else document a systemd-timer fallback).
- [ ] **Step 4** — Create a $1 physical product; as a **guest (no login)** browse `/store` → cart → checkout with email → pay the real card → confirm `/store/success` shows paid (no 404) and the order fulfilled via webhook. Then refund via the admin `store-refund`.
- [ ] **Step 5** — Hammer `store-checkout` 6× fast → confirm 429. Clean up test product/orders.
- [ ] **Step 6: Commit** the smoke-test results doc.

---

## Self-Review

- **Spec coverage:** guest checkout + rate limit (T2) · access_token + token-gated status (T1,T3) · catalog RPC (T1,T5) · storefront /store+cart+checkout+success (T5,T6) · admin + store-refund (T4,T7) · reconciliation (T8) · delete old fns (T9) · smoke test (T10). All spec sections mapped.
- **Placeholder scan:** none — real SQL/TS in each code step; UI steps cite exact files/lines + existing patterns to follow.
- **Type consistency:** `store-checkout` returns `{url, order_id, access_token}` (T2) consumed by `/store/success` via `store-order-status` (T3,T6); `gw_store_list_products()` columns (T1) consumed by `Shop.tsx` (T5); `gw_store_refund_order(p_order_id)` (Core) called by `store-refund` (T4) and reconcile is separate (`gw_store_reconcile_pending`, T8).

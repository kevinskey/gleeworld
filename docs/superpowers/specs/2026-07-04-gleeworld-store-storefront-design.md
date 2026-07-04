# GleeWorld Store (Storefront) — Design Spec

**Date:** 2026-07-04
**Status:** Approved design, pre-implementation
**Sub-project 2 of 3** (Commerce Core ✅ → **GleeWorld Store** → Tenant Store add-on)
**Builds on:** the merged Commerce Core (PR #17) — `gw_store_orders`/`_items`/`_entitlements`, `gw_store_fulfill_order`, `store-checkout`, `store-download`, the webhook branch. All live + smoke-tested on prod.
**Governing skills:** `gleeworld-commerce` (rules), `gleeworld-design` (UI), `stripe-expert` (Stripe mechanics).

## Purpose

Ship the customer-facing GleeWorld Store on gleeworld.com: browse → cart → **guest** checkout → success page → digital delivery, plus the admin to manage it and a job to sweep abandoned orders. This is a **rewire of the existing dormant storefront/admin onto the safe Core**, not a greenfield build.

## Decisions locked in brainstorming

- **Guest checkout** — anyone buys with just an email; a logged-in JWT is optional (links `buyer_user_id`).
- **Rewire existing UI** — reuse `Shop.tsx`, `CheckoutPage.tsx`, `ProductManager`, `OrdersManager`, etc.; repoint from the deleted `shop-checkout`/`create-stripe-checkout`/`verify-*` to `store-checkout` + `gw_store_orders`.
- **Client-side cart** (localStorage), holds `{product_id, variant_id?, quantity}` only — never prices.
- **YAGNI**: discounts/coupons deferred (tables exist, not wired); no server-side cart.

## Non-goals

- Tenant Store add-on (sub-project 3).
- Variant-level pricing/stock — still the open Core decision; this spec prices at product level (matches the live Core). If variants get their own price/stock, that is a Core change first.
- Coupons/discounts, wishlists, reviews.

---

## Section 1 — Guest checkout (Core change to `store-checkout`)

Relax auth **only** for `store_type='gleeworld'`:
- If no `Authorization` header → proceed as guest; require a valid `buyer_email` in the body.
- If a JWT is present → verify it via `verifyJwtClaims` (unchanged) and set `buyer_user_id`.
- `store_type='tenant'` is **unchanged**: still requires a verified JWT + the add-on gate.

**Card-testing defense** (a public endpoint that mints Stripe sessions is the #1 target):
- Rate-limit session creation per IP and per email (e.g. ≤5 / 10 min; return 429). Backing store: a small `gw_store_checkout_attempts(ip, email, created_at)` table or an in-memory/Deno KV counter — pick the table for durability across function instances.
- Hard caps: ≤20 line items, quantity 1..99 per item (already `Number.isInteger` guarded).
- Server-side pricing (already built) means a guest still cannot tamper amounts.
- Rely on Stripe Radar for stolen-card screening.

This is a reviewed money-endpoint change — its own task.

## Section 2 — Token-gated order status (`store-order-status`)

Avoid the audit's unauthenticated order IDOR. Mirror Box Office's `access_token`:
- **Schema:** `ALTER TABLE gw_store_orders ADD COLUMN access_token TEXT UNIQUE` (minted `encode(gen_random_bytes(24),'hex')` at order creation in `store-checkout`).
- `store-checkout` returns `{ url, order_id, access_token }`; success URL = `…/store/success?order=<id>&t=<token>`.
- **`store-order-status`** edge fn: `GET ?order=&t=` → returns `{ status }` (+ digital entitlement download tokens IF paid) **only when `t` matches the order's `access_token`**. Wrong/absent token → 403. No PII beyond status. Display-only (never writes).

## Section 3 — Storefront (rewire)

- **`/store`** (`Shop.tsx`): grid from `gw_products` (active, platform tenant `bb48609d…` via a public read RPC or an anon-safe view — since money tables are service-role-only, product reads need a public path: reuse the existing product-fetch or add a read-only `gw_products` policy for `anon` scoped to `is_active=true`). Physical/digital badges. `gleeworld-design` tokens; responsive to 375px.
- **Cart**: `src/features/store/cart.ts` — localStorage, `{product_id, variant_id?, quantity}`; add/remove/qty; never stores price.
- **Checkout** (`CheckoutPage.tsx`): collect `buyer_email` (+ shipping address when any item `requires_shipping`); POST to `store-checkout`; `window.location = url`. Repoint/delete the old `create-stripe-checkout`/`shop-checkout`/`verify-*` callers (`Checkout.tsx`, old `shop/Success.tsx` write path) — completes Core Task 7's deferred deletions.
- **`/store/success`** (new page): reads `?order=&t=` via `store-order-status`; shows "Payment confirmed" / "Processing…" (poll a few times if still pending — webhook may lag a second); for digital items, render `store-download` links. Purely presentational.

## Section 4 — Admin (rewire existing suite)

- **`ProductManager`**: CRUD `gw_products` (+ `gw_product_variants`, `gw_product_categories`, `gw_product_images`, and `digital_object_key` for digital uploads to DO Spaces). Admin-gated.
- **`OrdersManager` / `OrderDetailDrawer`**: list/read `gw_store_orders` + items (status, buyer, amount, shipping).
- **Refunds — `store-refund` edge fn** (new): `verifyJwtClaims` + admin role gate; calls Stripe refund on the order's `payment_intent` AND `gw_store_refund_order(order_id)` so Stripe and our DB stay in sync (status→refunded, stock restored). Idempotent.
- `InventoryManager`/`PaymentsManager` repointed to the new tables. `DiscountsManager` left dormant (YAGNI).
- **Product read for the public storefront**: add an `anon`/`authenticated` SELECT policy on `gw_products` limited to `is_active=true` (products aren't money rows; safe to expose the catalog). Money tables stay service-role-only.

## Section 5 — Reconciliation (orphan pending orders)

A scheduled sweep (edge fn via `pg_cron`, or a Postgres function on a cron) that sets `gw_store_orders` rows `status='pending' AND created_at < now() - interval '2 hours'` → `status='failed'`. Safe: pending orders never decremented stock or minted entitlements — nothing to reverse. Runs every ~15 min. Closes the gap the Core smoke test exposed (`store-checkout` writes the pending order before calling Stripe).

## Section 6 — Testing

- **Local logic tests** (fetch-stubbed, Deno) for: guest checkout (no JWT → 200 with server-priced order; JWT → `buyer_user_id` set), rate-limit (Nth attempt → 429), `store-order-status` (valid token → status; wrong/no token → 403), `store-refund` (admin-gated; syncs Stripe + DB), reconciliation sweep (old pending → failed; recent pending untouched).
- **Production smoke test** — repeat the Core's `$1` end-to-end **as a guest (no login)** once deployed: browse `/store` → cart → checkout with email → pay → `/store/success` shows paid (no 404 this time) → refund via admin. Then hammer the rate limit to confirm 429.
- SQL/migration changes tested against the scratch DB first (real schema), never prod, before the gated prod apply.

## Deployment / launch gate

Same discipline as the Core: build → all local tests green → deploy edge fns + migration to prod (approval-gated) → guest `$1` smoke test green → done. The Stripe key is now valid (fixed 2026-07-04). Live mode already in use.

## Open items carried forward

- Variant-level pricing/stock (Core decision) — if adopted, do it in the Core before wiring variant UI here.
- Digital uploads need `SPACES_*` env on the functions container (not currently set) — required before digital products work; physical works without it.

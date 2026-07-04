# Tenant Store Add-on — Design Spec

**Date:** 2026-07-04
**Status:** Approved design, pre-implementation
**Sub-project 3 of 3** (Commerce Core ✅ → GleeWorld Store ✅ → **Tenant Store add-on**)
**Builds on:** the live Commerce Core (#17) + GleeWorld Store (#25). Much of the backend already exists.
**Governing skills:** `gleeworld-commerce`, `gleeworld-design`, `stripe-expert`.

## Purpose

Let a tenant run their own store on their own Stripe (Connect) account, gated by a paid `store` add-on, surfaced as a block on their public site with **guest checkout**. The Core already handles the money for `store_type='tenant'`; this sub-project builds the tenant-facing surface + the one backend change needed for public guest checkout.

## What already exists (do NOT rebuild)

- `store-checkout` handles `store_type='tenant'` — gates on the `store` add-on (active/trial in `gw_tenant_subscriptions`) and resolves the tenant's `stripe_account_id` (Connect direct charge). **But currently requires a JWT** (guest → 401).
- `store-refund` — tenant-scoped + Connect-aware (`Stripe-Account`).
- `store-admin-orders` — tenant-scoped admin order read.
- `store-download`, `gw_store_fulfill_order`, the webhook branch — all tenant-agnostic, already live.
- `box-office-connect-onboarding` — the Stripe Connect onboarding flow (one connected account per tenant serves Box Office AND Store).
- `ProductManager` / `OrdersManager` (sub-project 2) — already tenant-scoped.

## Decisions locked in brainstorming

- **Store surface:** a `store` block in the existing public-site block builder (rewire the dormant `merch.tsx`, not a parallel block).
- **Guest checkout on tenant stores:** yes — tenant resolved from the request (slug/host), not a login.
- **Store-builder admin:** reuse the sub-project-2 tenant-scoped ProductManager/OrdersManager, gated by the `store` add-on.
- **Connect:** reuse `box-office-connect-onboarding`; one connected account per tenant. No new onboarding flow.
- **YAGNI:** rewire `merch.tsx` (no new block); no separate tenant onboarding.

## Non-goals

- Coupons/discounts, variant-level pricing (still the open Core decision — product-level here).
- Migrating the legacy GraduatesShop (separate follow-up).
- Multi-currency (usd only).

---

## Section 1 — Guest checkout on tenant stores (Core change to `store-checkout`)

Extend the guest path (currently `gleeworld`-only) to tenant stores, resolving the tenant server-side from a client-supplied `tenant_slug` (the store block, rendering on the tenant's own site, knows it):

For a guest (`no JWT`) with `store_type='tenant'` + `tenant_slug`:
1. Resolve the tenant: `gw_tenants?slug=eq.<slug>&select=id,stripe_account_id` → 404 if not found.
2. **Add-on gate:** the tenant must have an active/trial `store` row in `gw_tenant_subscriptions` → else 403. (A guest naming an arbitrary slug cannot check out against a tenant without the add-on.)
3. **Connect account:** if `stripe_account_id` is null → 400 "store not ready."
4. Prices looked up **scoped to that tenant_id** (server-side, unchanged).
5. Same rate limiting (per `x-real-ip` + email), same `access_token` mint.

Logged-in tenant checkout (JWT path) unchanged. Security rests on: the add-on gate, tenant-scoped product lookup, and server-resolved Connect account — the client only names *which enabled tenant store* it buys from, and can only buy that tenant's own products. `tenant_slug` is validated (slug charset) and `encodeURIComponent`'d in the PostgREST filter.

## Section 2 — Tenant catalog RPC

`gw_store_list_products()` is platform-hardcoded. Add `gw_store_list_tenant_products(p_tenant_slug text)` — SECURITY DEFINER, `search_path` pinned, returns the catalog columns (id, name, price, sale_price, requires_shipping, images, description) for that tenant's **active** products, **only if the tenant has an active/trial `store` subscription** (so a disabled tenant's catalog isn't public). `REVOKE FROM PUBLIC; GRANT EXECUTE TO anon, authenticated, service_role`. No PII, no money columns.

## Section 3 — The Store public-site block

Rewire `src/components/public-site/blocks/merch.tsx` (dormant) into the live Store block:
- Reads catalog via `supabase.rpc('gw_store_list_tenant_products', { p_tenant_slug })` (slug from the public-site render context, which already carries the tenant).
- Cart: reuse `src/features/store/cart.ts` (localStorage, no price).
- Checkout: collect `buyer_email` (+ shipping when any item `requires_shipping`), call `store-checkout` with `{ store_type:'tenant', tenant_slug, items: cart.getItems(), buyer_email, shipping_address? }`, redirect to the returned Stripe URL.
- Success: `store-checkout` `success_url` returns to the tenant site with `?order=&t=`; a success state (block or small `/store-success` handling on the public site) reads `store-order-status` and shows "Payment confirmed" — display-only. Since the tenant public site is block-rendered, add a minimal success surface consistent with how the public site handles query-param states.
- `gleeworld-design` tokens; responsive to 375px; uses the tenant's theme (public-site blocks already themetenant-aware).

## Section 4 — `store` add-on provisioning + Connect

- **Module registration:** add `store` to the module catalog/flags so `hasModule('store')` works (mirror `box_office`). Provisioned via the existing `create-module-checkout` (`module_id='store'`) → the droplet webhook upserts `gw_tenant_subscriptions` → active. No new provisioning code — it rides Box Office's rails. `store-checkout`'s gate already reads `module_id='store'`.
- **Connect wiring:** reuse `box-office-connect-onboarding`. One connected account per tenant (`gw_tenants.stripe_account_id`) serves both. The store admin shows a "Connect your Stripe" prompt (linking that flow) when `stripe_account_id` is null; if already connected for Box Office, the store works immediately.

## Section 5 — Store-builder admin (reuse, gated)

Surface the tenant-scoped `ProductManager` / `OrdersManager` to tenant admins behind a nav entry + route gated by `hasModule('store')` (appears only when the add-on is active). Already tenant-scoped (products by tenant; `store-admin-orders` by caller tenant). Refunds → the tenant-scoped Connect-aware `store-refund`. A tenant admin managing products for their own tenant is the intended use; no new CRUD.

## Section 6 — Testing

- **Local fetch-stubbed Deno** for `store-checkout` guest-tenant paths: guest + valid slug + active `store` add-on → 200 (server-priced, tenant's Connect account); slug without the add-on → 403; tenant with no `stripe_account_id` → 400; rate-limit → 429; JWT tenant path still works.
- **Scratch-DB SQL** for `gw_store_list_tenant_products`: returns only an add-on-enabled tenant's active products; a tenant without the add-on → empty; inactive products excluded; second tenant's products never leak.
- **Production smoke test on the `demo` tenant:** enable the `store` add-on (insert a `gw_tenant_subscriptions` row or run the module checkout), ensure a connected Stripe account, add a product, guest-buy from the demo subdomain's store block, confirm webhook fulfill → paid, refund via admin. Rate-limit hammer → 429. Clean up.

## Deployment / launch gate

Same discipline: build → all local tests green → deploy the migration + updated `store-checkout` to prod (approval-gated) → demo-tenant guest smoke test green → done. Live mode already in use; Stripe key valid.

## Open items carried forward

- Variant-level pricing/stock (Core decision).
- Legacy GraduatesShop migration (separate).
- Digital products on tenant stores need `SPACES_*` env (physical works without).

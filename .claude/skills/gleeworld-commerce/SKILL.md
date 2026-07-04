---
name: gleeworld-commerce
description: Use when building, editing, or reviewing ANY GleeWorld store, product, cart, checkout, payment, order, inventory, refund, or fulfillment code — the GleeWorld Store (platform-owned) or a Tenant Store add-on, physical or digital goods. Triggers on merch, shop, storefront, checkout, cart, order, SKU, inventory, Stripe, Connect, Square, webhook, payment, refund, digital download, entitlement — even when "commerce" is never said.
---

# GleeWorld Commerce

GleeWorld runs **two stores on one commerce core**. The core is where money-safety lives; the storefronts sit on top. For Stripe mechanics (test clocks, dispute flows, key rotation) defer to the global **stripe-expert** skill — this skill is the GleeWorld-specific architecture and the safe patterns that the 2026-07 payments audit proved were missing.

**Core principle:** money state lives in the payment provider and reaches the app ONLY through signature-verified webhooks. The app owns the catalog, entitlements, and messaging — never the source of truth for "is this paid."

## The two stores (know which one you're in)

| | GleeWorld Store | Tenant Store (add-on) |
|---|---|---|
| Owner | Platform (superadmin, gleeworld.com) | The tenant |
| Products & money | Yours | Tenant's |
| Stripe account | Platform account | Tenant's account via **Stripe Connect** (`gw_tenants.stripe_account_id`) |
| Where it shows | Public storefront + inside a tenant's app **only when the Store add-on is enabled** | Inside the tenant's app when they build one (the add-on unlocks the builder) |
| Gate | Add-on entitlement gates *access* to your store | Add-on entitlement gates the *builder* |

Both sell **physical + digital** goods. Both go through the same core rules below.

## Rule 1 — Prices are server-side, always (audit C1)

The client sends `product_id` + `quantity` (+ variant id). The server looks the price up from `gw_products`/`gw_product_variants` by id, scoped to the owning store/tenant. Never read an amount, price, or `unit_amount` from the request body. Validate quantity bounds (>0, ≤ stock). This is exactly what `create-plan-checkout`/`box-office-checkout` do right and what the old `shop-checkout`/`create-stripe-checkout`/`pos-create-payment-link` did wrong.

## Rule 2 — Fulfill only from a verified webhook (audit C3)

1. Server pre-creates a `pending` order row before redirecting to the provider.
2. The order is promoted to `paid`, inventory decremented, and digital entitlements/emails issued **only** inside a signature-verified webhook handler, gated on `payment_status === 'paid'`.
3. The success-redirect page is **display-only** — it may read status, never write it. There is no browser-triggered fulfillment path.

Mirror the Box Office reference: `gw_box_office_fulfill_order` row-locks the order + inventory `FOR UPDATE`, treats any non-`pending` order as an idempotent no-op, and re-checks stock under lock. Copy that shape; do not invent a new one.

## Rule 3 — One tenant-scoped order model (audit F2/F3/F4)

There is ONE order table, not the old `gw_orders` / `gw_user_orders` split. Every money table (`orders`, `order_items`, `payments`, `refunds`, webhook-events):
- `tenant_id UUID NOT NULL DEFAULT public.current_tenant_id()` + a **RESTRICTIVE** tenant-isolation RLS policy. For the GleeWorld Store use the platform tenant id — never a nullable tenant.
- Service-role policies scoped `TO service_role` (a policy with no `TO` clause applies to PUBLIC — that leaked raw Stripe payloads to anon).
- `UNIQUE` on the provider session id AND payment-intent id (idempotent upserts + webhook `event_id` dedupe). Amounts in **integer cents**, matching Box Office (`price_cents`), not float dollars.

## Rule 4 — Resolve the money account server-side (audit C2)

Which account collects is decided by the server from the store type, never from the client: GleeWorld Store → platform account; Tenant Store → that tenant's `stripe_account_id`. A tenant can never sell through another tenant's (or the platform's) account. Add-on entitlement is enforced in the API and RLS, **not just the UI** — a tenant without the Store add-on cannot create products or checkouts even by calling the endpoint directly.

## Rule 5 — Payment-provider seam (so "other platforms" is a drop-in)

Abstract at the checkout + webhook boundary: `createCheckout(provider, order)` and `handleWebhook(provider, rawBody, sig)`. Store/cart/inventory/order code stays provider-agnostic. Stripe Connect is the first and only fully-built provider; Square OAuth/sync functions already exist in the repo as the second candidate. Never hardcode `stripe.*` inside store or fulfillment logic — go through the seam.

## Rule 6 — Digital goods (audit security.md)

Deliver via **signed, short-TTL URLs** (DO Spaces presigned) — never a permanent public link (one buyer's link becomes everyone's, and refund-then-keep is trivial). Write one entitlement row per purchase and record delivery evidence (download timestamp, IP, account email) for friendly-fraud dispute defense.

## Rule 7 — Auth on every mutation (audit C2, H1)

Every mutating store/checkout/refund endpoint verifies the JWT **signature** (`getUser()` / `_shared/verifyJwt.ts`) before trusting any `tenant_id`/role claim — never a bare `atob()` decode (the gateway runs `VERIFY_JWT=false`). Public storefront reads are fine; checkout-session creation is rate-limited (card-testing defense); admin/refund/inventory endpoints are gated to a verified staff role. Never log full headers or webhook payloads (bearer tokens + PII leak into logs).

## Anti-patterns — these were the live bugs; never reintroduce them

- Reading price/amount/quantity from the request body → tampered charges.
- Marking an order paid / decrementing inventory in a `verify-*` function the browser calls after redirect → paid orders stuck pending when the tab closes; unpaid orders "fulfilled."
- An unauthenticated order-lookup endpoint that returns customer PII by order number → IDOR.
- A `checkout` endpoint with no auth that mints provider payment links for arbitrary amounts.
- Two parallel order tables / two checkout functions for the same concept → revenue silently under-reported.
- `CREATE POLICY … FOR ALL USING (true)` with no `TO service_role` → PUBLIC read of raw payment data.
- `onConflict` upsert with no matching UNIQUE constraint → `42P10`, payments silently never recorded.
- Hardcoding Stripe in store logic → the "add another processor" ask becomes a rewrite.

## Reference

- **stripe-expert** skill — provider mechanics, testing (test clocks/CLI), key rotation, dispute/refund flows.
- Box Office schema + `gw_box_office_fulfill_order` — the in-repo template for a correct atomic, idempotent, tenant-scoped money path. Copy it; don't reinvent it.

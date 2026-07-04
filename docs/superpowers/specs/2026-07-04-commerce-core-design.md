# Commerce Core — Design Spec

**Date:** 2026-07-04
**Status:** Approved design, pre-implementation
**Sub-project 1 of 3** (Commerce Core → GleeWorld Store → Tenant Store add-on)
**Governing skill:** `gleeworld-commerce` · **Stripe mechanics:** `stripe-expert`

## Purpose

Build the safe payment/fulfillment engine that both the GleeWorld Store and Tenant
Stores sit on. This sub-project replaces the dormant, unsafe merch code
(`shop-checkout`, `create-stripe-checkout`, `verify-*`, the `gw_orders`/`gw_user_orders`
split) and fixes every finding from the 2026-07 payments audit. The two storefronts
are separate sub-projects built on this core afterward.

**Design principle:** this is *the Box Office flow, for products instead of tickets.*
One order table, one atomic fulfill function, one verified-webhook trigger, one
provider seam. Chosen for security AND legibility — reusing the one money path that
passed the audit clean rather than inventing a new one.

## Non-goals (this sub-project)

- Storefront UI, cart UX, product-builder admin (sub-projects 2 and 3).
- Square/PayPal implementations (the seam is built; only Stripe is implemented).
- Real-money go-live (test mode until the launch gate below is green).

## Data model

Reuse `gw_products` (+ `gw_product_variants`, `gw_product_categories`,
`gw_product_images`) as the catalog — already tenant-scoped. New money tables mirror
Box Office (`gw_ticket_orders`/`gw_tickets`) field-for-field so the pattern is
recognizable:

### `gw_store_orders`
- `id uuid pk`
- `tenant_id uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants`
- `store_type text NOT NULL CHECK (store_type IN ('gleeworld','tenant'))`
- `provider text NOT NULL DEFAULT 'stripe'`
- `provider_session_id text UNIQUE` — idempotency + retry dedupe
- `provider_payment_intent_id text UNIQUE`
- `buyer_email text NOT NULL`, `buyer_user_id uuid NULL`
- `amount_cents integer NOT NULL DEFAULT 0 CHECK (amount_cents >= 0)`
- `currency text NOT NULL DEFAULT 'usd'`
- `status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','failed'))`
- shipping: `ship_to_name/line1/line2/city/state/postal/country` (nullable; physical only)
- `requires_shipping boolean NOT NULL DEFAULT false`
- `created_at`, `updated_at`

### `gw_store_order_items`
- `id uuid pk`, `tenant_id` (same default), `order_id → gw_store_orders ON DELETE CASCADE`
- `product_id uuid REFERENCES gw_products ON DELETE RESTRICT`
- `variant_id uuid NULL`
- `unit_price_cents integer NOT NULL CHECK (>= 0)` — **snapshot at purchase**, never re-read from the catalog
- `quantity integer NOT NULL CHECK (quantity > 0)`
- `is_digital boolean NOT NULL DEFAULT false`

### `gw_store_entitlements` (digital delivery)
- `id uuid pk`, `tenant_id`, `order_id`, `product_id`, `buyer_user_id`/`buyer_email`
- `download_token text NOT NULL UNIQUE`
- `expires_at timestamptz NULL`, `download_count integer NOT NULL DEFAULT 0`
- `last_downloaded_at`, `last_download_ip` — dispute evidence

All three: RESTRICTIVE tenant-isolation RLS; a service-role policy scoped `TO service_role`
(never a no-`TO` clause — that was the platform-wide leak). Amounts in **integer cents**.
GleeWorld Store rows use the platform tenant id (never a nullable tenant).

## The money flow

```
browser ──(product_id + qty only)──▶ store-checkout (edge fn)
   store-checkout:
     • verify JWT signature (getUser / verifyJwt); public reads OK, checkout gated + rate-limited
     • look up prices server-side from gw_products (+ variant), scoped to store/tenant
     • resolve account from store_type: platform vs gw_tenants.stripe_account_id (Connect) — server-side
     • enforce add-on entitlement (tenant store) in the API, not just UI
     • INSERT gw_store_order (status='pending') + items (unit_price_cents snapshot)
     • createCheckout(provider, {...}) with metadata.order_id, metadata.store_type
     • return checkout URL
        │
        ▼ (payment on Stripe)
Stripe ──▶ verified webhook (droplet webhook-server.js: sig-check + claimEvent dedupe)
     • checkout.session.completed with metadata.order_id  →  gw_store_fulfill_order(...)
        │
        ▼
gw_store_fulfill_order (SECURITY DEFINER, copied from gw_box_office_fulfill_order):
     • SELECT order FOR UPDATE
     • IF status <> 'pending' → return no-op  (idempotent vs Stripe retries)
     • per line item: decrement stock atomically, block oversell under lock
     • mint gw_store_entitlements for digital items
     • set status='paid', amount/session/intent recorded
     • return jsonb result
        │
        ▼
success page = DISPLAY ONLY (reads status; never writes)
```

Which webhook receiver: platform-account `checkout.session.completed` for the
GleeWorld Store on the existing `/stripe-webhook` (:3030); tenant Connect-account
events on the existing `/stripe-connect-webhook`. Both already verify signatures with
separate secrets. We add one branch: `metadata.order_id` present → store fulfillment.

## Provider seam

`supabase/functions/_shared/payments/`:
- `createCheckout(provider, { account, lineItems, orderId, metadata, mode })` → `{ url }`
- `verifyAndParseWebhook(provider, rawBody, sig)` → `{ event, orderId, sessionId, paymentIntentId, amountCents, paid }`

`stripe.ts` implements both (Connect-aware). `square.ts`/`paypal.ts` are future files
satisfying the same contract. Store/cart/inventory/fulfill code speaks only the
normalized shape — no `stripe.*` outside the seam.

## Digital delivery

`store-download` edge fn: verify buyer owns the entitlement → check `expires_at` →
mint a short-TTL presigned DO Spaces URL (never a permanent public link) → increment
`download_count`, record IP + timestamp. Physical items collect a shipping address at
checkout and flow to the existing shipping/order admin.

## Auth & isolation (audit-driven)

- Every mutating endpoint verifies the JWT **signature** before trusting `tenant_id`/role
  (never bare `atob`; gateway runs `VERIFY_JWT=false`). Public storefront reads allowed.
- Checkout-session creation rate-limited (card-testing defense).
- Account to charge resolved server-side from `store_type`; a tenant can never sell
  through another tenant's or the platform's account.
- Add-on entitlement enforced in API + RLS: no add-on → cannot create products or
  checkouts even by calling the endpoint directly.
- Never log full headers or webhook payloads.

## Deletions (dormant — 0 products, 0 orders in prod)

Retire, not patch: `shop-checkout`, `create-stripe-checkout`, `verify-shop-payment`,
`verify-stripe-payment`, the price-trust path in `pos-create-payment-link`, and the
`gw_orders`/`gw_user_orders` split (migrate any schema references to `gw_store_orders`).

## Testing (Stripe test mode; test clocks + CLI, never by waiting)

Must-pass matrix before the launch gate:
1. Tampered client price → rejected (server price wins).
2. Webhook delivered twice → fulfilled exactly once (idempotent lock).
3. Browser closed before redirect → order still fulfilled (webhook is the only path).
4. Two concurrent buyers, last unit → exactly one succeeds (oversell blocked under lock).
5. Digital download link expires; presigned URL is short-TTL; evidence logged.
6. Tenant A cannot read or sell into Tenant B's store (RLS).
7. Add-on off → product/checkout endpoints reject at the API.
8. Refund path flips status and restocks idempotently.

## Launch gate (go-live sequence)

Kevin has approved **live mode as the target**. Sequence is fixed:
**build → all 8 tests green in Stripe test mode → flip keys to live.**
Live mode is the last step, never before the matrix is green — real customer cards.

## Open items for the storefront sub-projects (not this spec)

- Cart UX and product-builder admin.
- The GleeWorld Store add-on's in-app surface vs. tenant-store-builder unlock (decided:
  the add-on unlocks the tenant's own store builder; GleeWorld Store is always-yours).
- Refund/dispute admin UI.

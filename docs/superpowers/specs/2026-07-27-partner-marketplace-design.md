# Partner Marketplace — Design Spec

**Working name:** GleeWorld Composer Store (front-end label TBD by Kevin).
**Date:** 2026-07-27.
**Status:** Design approved by Kevin (Stripe Connect Express, invite-only, watermark+signed-URL delivery, all D–J defaults accepted).

## Overview

Individual composers and independent publishers sell PDF choral/band scores directly on GleeWorld. GleeWorld hosts the storefront, handles payment and delivery, and takes a flat 50% platform fee. Partners keep 50%, paid out directly by Stripe. Purchased scores land in the buyer's My Music library, watermarked with the buyer's name and order number.

## Goals

- Give small composers a low-friction sales channel branded around the GleeWorld ecosystem.
- Give GleeWorld users an integrated buy → own → practice pipeline (no leaving the app).
- Ship an MVP in ~1–2 weeks that Kevin can invite 10–20 composers into.
- Zero money handling on the GleeWorld side — Stripe holds and moves everything.

## Non-goals (v1)

- Bulk import (Phase 2+).
- Composer analytics dashboards beyond a sales list (roll into a later analytics phase).
- Physical goods (this is digital only — Kevin's merch store per `feedback_droplet_compose_safety` memory stays dormant).
- Multi-currency (USD only for launch).
- Multi-format delivery (PDF only — no MusicXML, MIDI, MP3 sales in v1).
- Score bundles / discount codes / promo pricing.

## Actors

- **Buyer** — any authenticated GleeWorld user.
- **Partner** — invited composer/publisher with `gw_profiles.is_partner=true` and a linked Stripe Connect Express account. Same underlying auth user as a buyer; the `is_partner` flag flips on the partner-only surfaces.
- **Platform admin** (Kevin) — invites partners, moderates the catalog, handles disputed/fraud refunds, monitors gross vs net.

## Revenue model

- Stripe Connect Express. Each partner completes Stripe-hosted KYC.
- Every purchase is a Stripe PaymentIntent on the platform account with `application_fee_amount = 50%` and `transfer_data.destination = partner.stripe_connect_id`.
- Stripe pays partners on their standard payout schedule (weekly by default).
- Stripe issues 1099-K forms to partners; GleeWorld receives none of the partner-side tax paperwork.
- No refund policy in v1: all sales final. Fraud, duplicate, or never-downloaded → manual refund by admin, which calls Stripe `refunds.create({ payment_intent, amount, refund_application_fee: true })`. Stripe reverses the platform fee proportionally to the refund amount, so partner and platform each give back their share automatically. Reversal is expensed against future partner payouts if their balance is insufficient.

## Data model

Six new tables + one column addition. All net-new tables are **PLATFORM-GLOBAL** (no `tenant_id`) — a composer's score is not owned by any single tenant; buyers may be on any tenant subdomain.

### `gw_partners`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK auth.users | The composer's own GleeWorld account. UNIQUE — one partner per user. |
| `display_name` | text NOT NULL | Storefront name (may differ from user's real name). |
| `bio` | text | Composer bio, ~1–2 paragraphs. |
| `website_url` | text | |
| `contact_email` | text | Where GW support forwards questions. |
| `logo_storage_path` | text | Path in `partner-assets` bucket. |
| `stripe_connect_id` | text | `acct_...` from Stripe. NULL until onboarding done. |
| `stripe_charges_enabled` | boolean DEFAULT false | Mirror of Stripe `charges_enabled`. Blocks listing scores until true. |
| `stripe_payouts_enabled` | boolean DEFAULT false | |
| `status` | text CHECK ('invited','onboarding','active','suspended') | |
| `invite_token` | text UNIQUE | One-time link Kevin sends. Nulled once redeemed. |
| `invited_at` | timestamptz | |
| `activated_at` | timestamptz | |
| `created_at` | timestamptz | |

RLS:
- SELECT: any authenticated user can read `id, display_name, bio, website_url, logo_storage_path` for `status='active'` partners (public storefront). All other columns are private.
- INSERT/UPDATE/DELETE: platform admin OR the partner themselves (`user_id = auth.uid()`), constrained by column via a SECURITY DEFINER `partner_update_self()` RPC that whitelists which columns a partner can edit (never their own `status` or Stripe IDs).

### `gw_partner_scores`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `partner_id` | uuid FK gw_partners NOT NULL | |
| `title` | text NOT NULL | |
| `composer` | text | Free-form (may credit multiple composers) |
| `arranger` | text | |
| `voicing` | text | |
| `ensemble_type` | text | 'choral', 'band', 'orchestra', 'chamber', 'solo'. Same shape as `ext_catalog_items`. |
| `difficulty_grade` | text | |
| `language` | text | |
| `description` | text | |
| `tags` | text[] | |
| `price_cents` | integer NOT NULL CHECK (price_cents BETWEEN 100 AND 5000) | $1–$50. |
| `currency` | text DEFAULT 'USD' | |
| `master_storage_path` | text NOT NULL | Path in private `partner-scores-master` bucket. Clean PDF, never served. |
| `thumbnail_storage_path` | text | Auto-generated watermarked page-1 PNG. |
| `sample_audio_storage_path` | text | Optional partner-uploaded mp3. |
| `page_count` | integer | Populated at upload. |
| `status` | text CHECK ('draft','published','unlisted','removed') | |
| `search_vec` | tsvector generated | Mirrors `ext_catalog_items` — feeds into unified `repertoire_search()` results. |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

RLS:
- SELECT: any authenticated user for `status='published'`. Partner sees all their own rows regardless of status. Admin sees all.
- INSERT/UPDATE/DELETE: partner (`partner_id = my_partner_id()`) via a helper function that returns the caller's partner_id, OR platform admin.
- The unified `repertoire_search()` RPC gets extended in the implementation phase to UNION `gw_partner_scores` alongside `pd_works` + `ext_catalog_items`. `source='store'` is the badge.

### `gw_partner_orders`

Order-level record, one row per checkout session. Multiple scores per order supported from day one (cheap now, expensive later).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `buyer_user_id` | uuid FK auth.users NOT NULL | |
| `stripe_payment_intent_id` | text UNIQUE | |
| `stripe_checkout_session_id` | text UNIQUE | |
| `subtotal_cents` | integer NOT NULL | |
| `platform_fee_cents` | integer NOT NULL | Always 50% of subtotal. Stored explicitly for accounting. |
| `currency` | text DEFAULT 'USD' | |
| `status` | text CHECK ('pending','paid','failed','refunded','partial_refund') | |
| `paid_at` | timestamptz | |
| `refunded_at` | timestamptz | |
| `created_at` | timestamptz | |

RLS: buyer sees own orders; partners see order-level rows containing THEIR scores via an aggregation view; admin sees all.

### `gw_partner_order_items`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `order_id` | uuid FK gw_partner_orders NOT NULL | |
| `partner_score_id` | uuid FK gw_partner_scores NOT NULL | |
| `partner_id` | uuid FK gw_partners NOT NULL | Denormalized snapshot at purchase; survives partner-score deletion for accounting. |
| `price_cents` | integer NOT NULL | Snapshot at purchase (partner may change price after). |
| `platform_fee_cents` | integer NOT NULL | Snapshot. |
| `partner_payout_cents` | integer NOT NULL | Snapshot. |
| `watermarked_storage_path` | text | Filled after successful watermark job. |
| `entitlement_id` | uuid FK gw_store_entitlements | Optional link into existing entitlement system for compatibility. |

### `gw_partner_downloads`

Audit log — one row per successful buyer download.

| Column | Type |
|---|---|
| `id` | uuid PK |
| `order_item_id` | uuid FK gw_partner_order_items NOT NULL |
| `downloaded_at` | timestamptz |
| `client_ip` | inet |
| `user_agent` | text |

### `gw_partner_invites`

Kevin-sent invitations that haven't been redeemed. Separate table so we can send/expire/reissue independently of the eventual partner record.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | text NOT NULL | |
| `display_name` | text | Suggested storefront name, editable at redemption. |
| `invited_by` | uuid FK auth.users | Kevin. |
| `token` | text UNIQUE NOT NULL | 32-byte random URL-safe. |
| `expires_at` | timestamptz NOT NULL DEFAULT now() + interval '30 days' | |
| `redeemed_at` | timestamptz | |
| `redeemed_by_user_id` | uuid FK auth.users | |
| `created_at` | timestamptz | |

### Column addition — `gw_profiles`

`is_partner` boolean DEFAULT false. Cheap denormalization for nav gating so we don't hit `gw_partners` on every page render. Toggled by DB trigger on `gw_partners` insert/update.

## Buckets

Two new DO Spaces buckets (per `reference_supabase_storage_flatten` — writes flatten via cron):
- `partner-assets` — public. Logos, sample audio, thumbnails.
- `partner-scores-master` — private. Clean PDFs. **Never served directly.**

The buyer download path uses a NEW bucket `personal-scores` (already exists per `project_personal_music_library`) for the watermarked copy, keyed at `<buyer_user_id>/store/<order_item_id>.pdf`.

## File flow

1. Partner uploads clean PDF via portal → stored at `partner-scores-master/<partner_id>/<score_id>.pdf`.
2. Edge fn `partner-score-postprocess` runs on upload: extracts page count, rasterizes page 1 to a watermarked-with-composer-name PNG for the storefront thumbnail, stores in `partner-assets`.
3. Buyer purchases → Stripe webhook `checkout.session.completed` triggers edge fn `partner-order-fulfill`:
   - Marks order `paid`.
   - Insert `gw_partner_order_items` (with `platform_fee_cents = round(price * 0.50)`).
   - For each item: fetch master PDF, run `partner-watermark` fn — pdf-lib stamps a footer on every page: `"Purchased by <buyer.display_name> · GleeWorld Order #<order.id.short> · License to one performer"`. Upload watermarked copy to `personal-scores/<buyer_user_id>/store/<order_item_id>.pdf`. Set `watermarked_storage_path`.
   - Insert `gw_store_entitlements` row for compatibility (buyer_user_id, product_id=null, entitlement metadata references order_item_id).
   - Insert `gw_personal_scores` row: `source='purchase'`, `entitlement_id=<new>`, `storage_path=<watermarked path>`, `title/composer/voicing` copied from the score.
   - Optionally send a "Your score is ready" email via existing broadcast infra.
4. Buyer's My Music tab shows the new row immediately (already-built page).
5. Any subsequent download signs a fresh 5-minute URL on the watermarked bucket path. Logs a `gw_partner_downloads` row.

Watermark rendering uses **pdf-lib** in Deno (already installed as a shared edge-fn dep for other flows — verify in the plan; add if not). Font: bundled Deja Vu Sans. Footer height 22pt.

## UI surfaces

### 1. Store front — `/store` (new route, public read)

- Landing page: hero, top partner picks, browse-by-ensemble tiles, search bar (unified with Repertoire).
- Score detail — `/store/scores/:id`: title, composer, voicing, price, thumbnail, sample audio player, description, tags, "Add to Cart" button, "Buy Now" button. Partner logo + link to their storefront.
- Partner storefront — `/store/partners/:id`: their bio, logo, all their published scores, contact link.
- Cart (client-side session) → Stripe Checkout redirect.

### 2. Music Library integration

`/dashboard/music-library` header adds a "Browse composer store" link that deep-links to `/store`.

`/dashboard/repertoire` (existing Phase 1 page) also surfaces store scores in Browse + Search results with a `source='store'` badge. Click → `/store/scores/:id`.

### 3. Partner portal — `/partner`

Gated by `gw_profiles.is_partner = true`.
- Dashboard: last 30 days revenue, total sales count, pending payouts (via Stripe API call), open in Stripe Express dashboard link, gross-vs-net breakdown showing platform fee.
- Profile: edit display_name, bio, website, contact_email, logo upload.
- Scores: list of all their scores, add-score button, edit inline (title/description/tags/price/status), delete (only if never purchased — else soft-delete via `status='removed'`).
- Add-score wizard: upload PDF → auto page count + thumbnail preview → title/composer/voicing/ensemble/difficulty/description/tags/price → publish OR save-as-draft.

### 4. Admin — `/admin/partners`

Platform admin only.
- Invite new partner: email + suggested display_name → sends the invite email with the `/partner/invite/:token` link.
- List of partners: sortable by activation date, revenue, status. Suspend / reactivate.
- Refund a specific order: full or partial. Stripe reversal + entitlement revocation.

### 5. Nav additions

- New `music` section entry: **Store** icon `ShoppingBag`, tone `bg-emerald-50 text-emerald-700`, tourId `nav-store`, key `store`.
- New separate section entry (or admin section) for **Partner Portal** if `is_partner`: icon `Store`.

## Onboarding flow

1. Kevin at `/admin/partners` types composer's email + display name → clicks Invite.
2. Edge fn `partner-invite-send` creates `gw_partner_invites` row + sends email:
   > "Hi <name> — Kevin at GleeWorld invited you to sell your scores in our Composer Store. Click here to set up your storefront: <link>. Link expires in 30 days."
3. Composer clicks link → `/partner/invite/:token`. If not signed in: prompted to create GleeWorld account or sign in (email tied to invite is pre-filled). Any GleeWorld user can redeem, but the email must match — token is checked against the invite's email at redemption.
4. Redemption: creates a `gw_partners` row with `status='onboarding'`, sets `gw_profiles.is_partner=true`, marks the invite `redeemed_at`.
5. Immediately shown a "Set up payouts" screen. Clicks Continue → we call Stripe API `accounts.create({type: 'express'})` → get back `acct_...` → save as `stripe_connect_id`, get an account-onboarding link, redirect the composer to Stripe.
6. Composer completes Stripe hosted form (KYC, bank). Stripe redirects back to `/partner?welcome=1`. We call `stripe.accounts.retrieve(acct_id)` to check `charges_enabled` + `payouts_enabled`, mirror onto our row, set `status='active'` when both true.
7. Composer can now list scores.

## Purchase flow

1. Buyer clicks "Buy Now" on a score → we call edge fn `partner-checkout-create`:
   - Insert `gw_partner_orders` with `status='pending'`.
   - Call Stripe `checkout.sessions.create` with `line_items` for each cart item, `payment_intent_data.application_fee_amount = subtotal * 0.50`, `payment_intent_data.transfer_data.destination = partner.stripe_connect_id` (v1: single-partner cart only — see decision note below).
   - Return the Stripe Checkout URL. Redirect buyer.
2. Buyer completes payment on Stripe.
3. Stripe posts webhook `checkout.session.completed` → verified via Stripe signing secret → dispatched to `partner-order-fulfill` fn described in File Flow.
4. Buyer redirected back to `/store/thanks?order=<id>` — shows a "Preparing your score…" indicator, polls the order status via a lightweight RPC, then flips to "Ready — download or open in My Music" once `gw_partner_order_items.watermarked_storage_path` fills.

**Single-partner cart in v1** — a Stripe Checkout session with `transfer_data.destination` only supports one destination account. Multi-partner cart requires Stripe Connect Destination Charges w/ multiple `Transfer` calls after the fact, or Separate Charges (a session per partner). Both are follow-ups. v1 constraint: cart may contain many items but all must be from ONE partner. If the buyer tries to add a second partner's score, we show a "Complete current partner purchase first" message.

## Discovery

Store scores appear in **three places** so buyers can find them however they browse:

1. `/store` — the marketplace itself.
2. `/dashboard/repertoire` (Phase 1 page) — extended `repertoire_search()` RPC UNIONs `gw_partner_scores` with existing sources. Result cards get a source badge "Store" + a price + a "Buy" button that navigates to `/store/scores/:id`.
3. `/dashboard/music-library` header link — "Browse composer store".

## Error handling

- Stripe webhook signature invalid → return 400, log to Sentry, take no action.
- Watermark job fails → mark order item as `watermarked_storage_path=NULL`, retry-queue via a `gw_job_queue` row. Buyer sees "Preparing…" until it succeeds or 15 min timeout, then support notification.
- Partner not activated (`charges_enabled=false`) tries to publish → block at UI level; server rejects the update with a friendly message.
- Duplicate purchase (same score purchased twice by same user) → allowed. Two separate watermarked PDFs stored, two entitlements. Buyer can revoke duplicates from My Music if desired.
- Refund via admin UI → Stripe refund + application-fee reversal. Order marked refunded. Entitlement revoked. `gw_personal_scores` row: soft-deleted (`storage_path=null`, `deleted_at=now()`) rather than hard-deleted.

## Testing

- Vitest unit tests for the query-key + price-calc utility functions.
- Playwright E2E test with `demo@` user: browse store → mock a Stripe Checkout completion via webhook replay → verify My Music row appears with the watermarked path.
- Stripe test-mode integration test: real end-to-end using Stripe test cards + Stripe CLI webhook forwarding to local dev server.
- Watermark-visual regression test: sample PDF in → snapshot the rendered watermarked page 1.

## Security

- Master PDFs never served — only watermarked copies via signed URL.
- Signed URLs are 5 minutes.
- Buyer's real name is the watermark — not their email. Kevin's `feedback_gleeworld_tenant_neutral` memory: never hardcode Spelman. Watermark says "GleeWorld", not the buyer's tenant name.
- Stripe webhook signature verified with the endpoint's signing secret pulled from `/opt/supabase/.env`.
- Partner cannot see other partners' revenue or scores. Admin can.
- Partner cannot elevate `status`, change `stripe_connect_id`, or read other partners' rows (enforced by the SECURITY DEFINER helper RPC).
- The invite token is single-use, 30-day expiration, unique index enforces no reuse.

## Decomposition into implementation plans

This spec is too large for a single implementation plan. It breaks cleanly into three shippable sub-plans, each producing working software on its own:

**Sub-plan 1 — Foundation (schema + partner onboarding)**
Migrations for `gw_partners`, `gw_partner_scores`, `gw_partner_invites`, `gw_profiles.is_partner`. Buckets. Admin invite UI at `/admin/partners`. Partner-invite redemption at `/partner/invite/:token`. Stripe Connect Express account creation + onboarding link. Partner portal at `/partner`: profile edit, upload PDF, page-1 thumbnail generation, list score drafts. **Ships as:** Kevin can invite composers, they onboard on Stripe, upload PDFs to drafts. Nothing sells yet.

**Sub-plan 2 — Store + purchase (money-making)**
Migrations for `gw_partner_orders`, `gw_partner_order_items`, `gw_partner_downloads`. Storefront at `/store`, `/store/scores/:id`, `/store/partners/:id`. Cart. Stripe Checkout create edge fn. Webhook handler at `/functions/v1/partner-webhook` (verified via Stripe signing secret). Watermark edge fn (pdf-lib). Fulfillment: create entitlement, write watermarked PDF, insert `gw_personal_scores` row. Thanks-page polling. **Ships as:** real end-to-end purchases work; buyer receives watermarked PDF in My Music.

**Sub-plan 3 — Discovery + admin polish**
Extend `repertoire_search()` and `repertoire_featured()` to UNION `gw_partner_scores`. Add source badge + Buy button to `RepertoireResultCard`. Music Library header link. Admin partner-management UI (suspend, reactivate, refund order). Rollout feature-flag on tenant config. **Ships as:** partner scores are discoverable through the existing Repertoire search; Kevin has admin tools.

Each sub-plan gets its own `docs/superpowers/plans/<date>-partner-marketplace-<N>-*.md` file. Start with Sub-plan 1.

## Rollout plan

- Ship migrations + edge fns + admin UI + partner portal + storefront UI.
- Feature-flag the store nav entry off by default (`window.__GW_STORE_ENABLED__` in tenant config). Enable on kevin.gleeworld.org first for internal testing.
- Kevin invites 3 test composers in test mode (Stripe test keys).
- One end-to-end real purchase using Kevin's card, verify Stripe dashboard shows correct 50/50 split.
- Enable on gleeworld.org main after real purchase works.
- Kevin sends invites to the first 15 target composers.

## Follow-ups explicitly out of v1 scope

- Multi-partner cart (v1: one partner per checkout).
- Coupon / promo codes.
- Bundle products.
- MusicXML / MIDI / MP3 sales.
- Composer analytics dashboard (impressions, conversion).
- Physical goods (still using dormant `gw_merch_*` tables).
- Score previews via streaming pages (v1: page-1 thumbnail only).
- Tenant-scoped stores (a school selling its own composers under its subdomain).
- Multi-currency.
- Subscription / recurring pricing.
- Partner reviews / ratings.

## Open questions to resolve during implementation

- Confirm the exact composer-facing product name — "Composer Store", "Marketplace", "Sheet Music Store" — Kevin's call. Placeholder: **Store**.
- Confirm 1099 threshold implications for our platform (Stripe handles 1099s but we're the platform of record; talk to accountant before enabling live-mode).
- Should partners set their own withdrawal schedule or accept Stripe's default weekly payouts? Stripe default in v1.

# GW Sheet Music Store — Design

**Date:** 2026-07-31
**Status:** Approved in conversation; pending spec review
**Builds on:** Partner Marketplace sub-plan 1 (PR #302): `gw_partners`, partner scores, Stripe Connect onboarding, `/partner` portal, `/store` pages.

## Vision

Users buy scores from the **GW Sheet Music Store**, reached as a tab inside the
Music Library. Each partner (composer or publishing company) gets a **complete
store** of their own. The GW Main store is a curated front door: featured
stores and featured pieces, hand-picked by the platform owner. Clicking a
featured piece takes the user to that piece **in its store of origin** — that
is the power of featured selections: every feature drives traffic into a
partner's full catalog.

## 1. GW Main store — Music Library tab

- `src/pages/dashboard/MusicLibraryPage.tsx` top tabs become:
  **Scores | My Music | Setlists | GW Sheet Music Store | Public Domain**
  (new `store` tab immediately before `public-domain`).
- Tab content, top to bottom:
  1. **Featured Stores** row — partner cards (owner photo, store name,
     tagline) → partner storefront.
  2. **Featured Pieces** row — score cards → the partner storefront **scrolled
     to and highlighting that score** (e.g. `/store/partners/:id?score=<id>`),
     not the bare score-detail page.
  3. **Browse** — directory of all active partner stores, plus a searchable
     all-scores grid (reuses the existing store grid, extracted into a shared
     component so the tab and `/store` page cannot drift).
- Renames: "Composer Store" → "GW Sheet Music Store" in `StorePage.tsx` title
  and the `MyMusicTab.tsx` purchase-source label. Subtitle ("Buy sheet music
  directly from independent composers and publishers.") stays.
- Remove the standalone `composer-store` entry from
  `src/lib/navigation/navCatalog.ts`. All `/store/*` routes stay live
  (score detail, checkout return, thanks page, shared links).

## 2. Partner storefronts (public)

`/store/partners/:id` becomes a complete store:

- Header: owner photo, store display name, website link.
- **History / About** section (long-form text).
- **Featured Items** shelf — the partner's own picks, ordered by the partner.
- Full catalog grid below, purchasable via the existing checkout flow.
- Supports a `?score=<id>` param: scroll to and highlight that score (used by
  GW Main store featured pieces).

## 3. Partner backend (`/partner` portal)

Additions to the existing portal (profile, uploads, Stripe payouts stay):

- Owner photo upload (same `partner-assets` bucket pattern as the logo).
- History / About editor.
- "Feature these items" picker with ordering, controlling the storefront's
  Featured Items shelf. Partners can only feature their own scores.

## 4. Email-driven auth landing

- `gw_partners` carries the partner's email.
- On sign-in, if the auth email matches a partner record, the user is linked
  to that partner automatically (no invite token required) and lands directly
  in `/partner` — the portal is a partner's home.
- Existing invite links keep working for backward compatibility.
- The portal keeps a visible link to the regular dashboard for partners who
  are also members.
- Email matching is case-insensitive and only links when the partner record
  has no linked user yet (or already links this user); it never re-links a
  partner away from an established user.

## 5. Platform curation controls

- `/admin/partners` gains featuring controls: mark a store featured (with
  order) and pick GW-featured pieces (with order).
- Super-admin only. Partners cannot feature themselves on the GW Main store.

## Data changes

On existing partner tables (no new tables expected):

- `gw_partners`: `contact_email` (for auth matching), `owner_photo_storage_path`,
  `history` (text), `featured_order` (nullable int; non-null = featured on GW
  Main store, ascending order).
- Partner scores table: `partner_featured_order` (nullable int; partner's own
  storefront shelf) and `gw_featured_order` (nullable int; GW Main store
  featured pieces).
- RLS: partners may update their own profile fields and
  `partner_featured_order` on their own scores (via `my_partner_id()` — every
  `useMyPartner*` query filters by it first); only super-admin may write
  `featured_order` / `gw_featured_order`. Public read of active partners and
  published scores is unchanged.

## Not changing

Checkout flow, Stripe Connect onboarding/payouts, score upload pipeline,
score-detail page, partner invite redemption, and the Music Library's other
tabs. No per-tenant scoping changes: the store remains platform-level.

## Testing

- Unit: email→partner matching (case-insensitivity, already-linked guard),
  featured ordering queries.
- Component: Music Library renders the new tab in the correct position;
  featured piece card links to store-of-origin with `?score=` param;
  storefront highlights the target score.
- Manual: partner signs in by email → lands in portal; sets photo/history/
  featured items → storefront reflects them; super-admin features a store and
  a piece → GW Main store reflects both; purchase still completes end-to-end.

# Personal Music Library, Lion & Lamb Publisher Store, and Offline Vault

**Date:** 2026-07-12
**Status:** Approved by Kevin (brainstorm session 2026-07-12)
**Owner:** Kevin Johnson

## Why

Members need music that belongs to *them*, not just to their choir: PDFs they upload, public-domain scores they save from CPDL, and scores they purchase. That personal collection must be usable offline and logged out (backstage, no signal, no sign-in). Separately, Lion & Lamb Publishers becomes the first outside-publisher source: users browse, preview, and buy scores inside the Music Library or Viewer, delivered as watermarked PDFs.

Decisions locked during brainstorming:

- Offline model: **in-app offline library** (IndexedDB vault; no service worker — SW caching is banned in this app)
- Personal library **follows the person** across tenants (user-scoped, like favorites/annotations)
- L&L purchases ride the **platform Stripe account** via the existing store pipeline
- Catalog managed through a **simple platform-admin UI**
- **Individuals-only** purchasing in v1 (choir/seat licensing is a fast-follow)
- Purchased PDFs are **watermarked** with buyer identity at delivery
- Admin (tenant) library: scores an admin marks as shared are visible to that tenant's **logged-in** members in the regular Music Library — no personal-library or offline entanglement

## What exists and is reused

| Piece | Where | Reused for |
|---|---|---|
| Digital-goods pipeline: `gw_products` (`digital_object_key`) → `store-checkout` → Stripe webhook → `gw_store_entitlements` (`download_token`) → `store-download` (5-min presigned Spaces URL) | `supabase/migrations/20260705*`, `supabase/functions/store-*` | L&L purchases end-to-end |
| CPDL catalog + PDF cache: `pd_works` (+`storage_key`), `pd-ingest-cpdl`, `pd-add-to-library` (fetch once, cache in `sheet-music` bucket `pd-cache/`) | `supabase/functions/pd-*`, `20260622050000/60000` migrations | "Save to My Music" from Public Domain tab |
| Per-user RLS pattern (`auth.uid()`, no tenant_id) | `gw_sheet_music_favorites`, `_annotations`, etc. | `gw_personal_scores` policies |
| Viewer + annotations | `src/components/viewer/` | Opens every personal score |
| Music Library page (Scores / Setlists / Public Domain tabs) | `src/pages/dashboard/MusicLibraryPage.tsx` | Gains My Music + Publisher tabs |
| Rights model | `20260622040000_sheet_music_rights.sql` | Publisher scores are `licensed`; shared-library flag interacts with nothing else in v1 |

## Data model (new)

```sql
-- Personal library: one row per score a user owns/saved. NO tenant_id.
create table gw_personal_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  composer text,
  voicing text,
  source text not null check (source in ('upload','cpdl','purchase')),
  pd_work_id uuid references pd_works(id),          -- when source='cpdl'
  entitlement_id uuid references gw_store_entitlements(id), -- when source='purchase'
  storage_path text not null,                        -- bucket-relative or spaces key
  thumbnail_path text,
  created_at timestamptz not null default now()
);
-- RLS: user_id = auth.uid() for all of select/insert/update/delete.
-- Partial unique indexes: (user_id, pd_work_id) and (user_id, entitlement_id).

-- Publisher catalog metadata (pricing/fulfillment live on gw_products).
create table gw_publisher_scores (
  id uuid primary key default gen_random_uuid(),
  publisher_slug text not null default 'lion-and-lamb',
  product_id uuid not null references gw_products(id),
  title text not null,
  composer text,
  voicing text,
  difficulty text,
  pages int,
  preview_path text,           -- public first-page preview PDF
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
-- RLS: active rows readable by anyone including anon (logged-out users see the
-- catalog with prices/previews and a sign-in prompt on Buy); writable by
-- platform admins only.

-- Tenant library sharing: one new column.
alter table gw_sheet_music add column shared_with_members boolean not null default false;
```

`gw_personal_scores` deliberately has no `tenant_id`: the library follows the person. This matches the established favorites/annotations exception to the tenant-RLS-everywhere rule and must be documented in the migration comment (the multi-tenant audit sweeps flag tenantless tables).

## Storage layout (DO Spaces)

```
publishers/lion-and-lamb/scores/<catalog_id>.pdf     # masters — presigned-only, never public
publishers/lion-and-lamb/previews/<catalog_id>.pdf   # first page — public
publishers/lion-and-lamb/stamped/<entitlement_id>.pdf # watermarked copies, stamped once, reused
personal/<user_id>/uploads/<id>.pdf                  # user uploads — per-user storage policy
```

Personal uploads go through Supabase Storage (bucket `personal-scores`, private, policy `user_id = auth.uid()` on path prefix). Publisher masters/stamped copies are direct-Spaces objects handled only by edge functions (same `aws4fetch` pattern as `store-download`).

## UX

### My Music (phase 1)
Fourth tab in the dashboard Music Library. Lists all personal scores with source badges (Upload / CPDL / Lion & Lamb). Upload button → PDF picker + title/composer/voicing form. Items open in the existing viewer with annotations. Purchased items get "Re-download". Empty state invites: upload, browse Public Domain, browse Publisher.

### Publisher tab: Lion & Lamb (phase 2)
Catalog cards: title, composer, voicing, pages, price, "Preview" (public preview PDF in viewer), "Buy". Buy → existing store checkout (Stripe, platform account) → success → score appears in My Music (fulfillment webhook inserts the `gw_personal_scores` row). Viewer preview mode shows a persistent "Buy this score — $X" bar.

### Admin catalog UI (phase 2)
Platform-admin-only screen (existing admin area): upload master PDF (auto-derives page count + first-page preview), enter title/composer/voicing/difficulty/price, publish/deactivate. Creates/updates `gw_products` (+`digital_object_key`) and `gw_publisher_scores` together.

### Offline vault + logged-out access (phase 3)
- Explicit per-score "Save to this device" on every My Music item → stores PDF blob + metadata in IndexedDB (`idb` library; stores: `files`, `manifest`).
- `/my-music` route works **logged out**: renders purely from the vault; viewer works; annotations made offline stay local and sync on next sign-in.
- Storage meter + per-score "Remove from device". "Saved" state is verified against actual blob presence, not just the manifest.
- iOS: same IndexedDB path inside WKWebView for v1; native Filesystem plugin only if eviction bites (revisit then).

### Shared choir library (phase 1, small)
Admins (librarian/edit permission) get a "Shared with members" toggle per score in the tenant Music Library. Members' Scores tab shows only shared scores (admins/librarians continue to see everything). Logged-in only; no device save implications; licensed-score exposure unchanged (viewing stays inside the tenant, as today).

### CPDL → My Music (phase 4)
`pd-add-to-library` gains `target: 'personal'`: same shared `pd-cache/` fetch-and-cache, then inserts `gw_personal_scores` (source `cpdl`) instead of a tenant `gw_sheet_music` row. Public Domain tab shows "Save to My Music" for everyone; the existing tenant-library button remains for librarians.

## Watermarked delivery (phase 2)

New edge function `score-download`:
1. Validate `download_token` against `gw_store_entitlements` (reuse `store-download` checks: expiry, revocation, download evidence).
2. If `stamped/<entitlement_id>.pdf` missing: fetch master, stamp every page footer — `Licensed to {buyer name} · {email} · Order {order_id}` — with `pdf-lib`, upload stamped copy.
3. Return 5-minute presigned URL to the stamped copy.

Personal uploads and CPDL scores bypass stamping entirely (`getSignedUrl` / public cache paths as today).

## Security & failure handling

- Personal storage: per-user path policies; no cross-user reads possible even with a leaked path (private bucket).
- Publisher masters never get public or long-lived URLs; previews are the only public artifacts.
- Refunds (existing `store-refund`) revoke the entitlement → My Music row greys out ("purchase refunded"), re-download blocked. Already-saved device copies are out of reach — accepted.
- Checkout requires sign-in (fans included). Logged-out users see prices + previews with a sign-in prompt.
- Rate limiting via existing `download_count` / `last_download_ip` evidence columns; stamping failures fall back to an error toast, never to delivering the unstamped master.
- Vault honesty: `/my-music` shows only verified-present blobs; IndexedDB persistence requested via `navigator.storage.persist()`.

## Phasing (each ships independently)

| Phase | Contents | Gate |
|---|---|---|
| 1 | `gw_personal_scores` + `personal-scores` bucket + My Music tab + uploads + `shared_with_members` toggle & member filtering | RLS tests green; demo-tenant browser pass |
| 2 | Spaces `publishers/` layout, `gw_publisher_scores` + admin UI, Publisher tab + Viewer buy bar, checkout wiring, `score-download` watermarking | Stripe **test-mode** end-to-end purchase; stamped PDF verified |
| 3 | IndexedDB vault, save-to-device, logged-out `/my-music`, storage meter | Offline browser pass (device emulation, airplane-mode check) |
| 4 | CPDL save-to-personal, source badges polish, storage meter refinements | Existing pd-ingest tests + new target test |

## Testing

- Migration tests: RLS on `gw_personal_scores` (user A cannot read/write user B), `shared_with_members` filtering per role, entitlement uniqueness.
- Edge function tests: `score-download` stamping (idempotent, refuses revoked/expired tokens), `pd-add-to-library` personal target.
- Stripe test-mode purchase before phase 2 deploys (existing `stripe-webhook` fixtures).
- Browser verification per phase on demo tenant + one real logged-out `/my-music` pass on a phone-width viewport.

## Out of scope (explicitly)

Choir/seat licensing for publisher scores; additional publishers beyond Lion & Lamb (schema supports them via `publisher_slug`, UI doesn't); DRM beyond watermarking; native iOS Filesystem storage; selling user uploads; public sharing of personal libraries.

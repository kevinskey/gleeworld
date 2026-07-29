# Repertoire Search — Phases 2, 3, 4 Roadmap

Phase 1 (unified CPDL + IMSLP browse/search) shipped in PR #302 on 2026-07-27. This doc scopes the follow-on phases so each can be picked up independently.

## Phase 2 — Commercial catalog via CJ Affiliate

**Goal:** Ingest JW Pepper + Sheet Music Plus into `ext_catalog_items` alongside IMSLP so directors can find publisher-catalog music (with Editor's Picks) and click through affiliate links for revenue share.

**External blocker (Kevin owns):**
- Sign up as a CJ Affiliate publisher at cj.com.
- Request approval from JW Pepper and Sheet Music Plus advertiser programs (both are on CJ).
- Receive Website ID, personal access token, and product-feed URLs (usually XML/CSV nightly drops).

**Implementable once creds land:**
1. Add secrets to `/opt/supabase/.env`: `CJ_PAT`, `CJ_WEBSITE_ID`, `CJ_JWP_ADV_ID`, `CJ_SMP_ADV_ID`.
2. New edge fn `supabase/functions/ext-ingest-cj/index.ts` — mirrors `ext-ingest-imslp` shape. Body: `{ "advertiser": "jwpepper" | "sheetmusicplus", "max_records": 500 }`. Upserts into `ext_catalog_items` on `(source, source_id)` where source=`jwpepper` or `sheetmusicplus`. Sets `editors_choice=true` for rows in the CJ feed's "Editor's Choice" category/tag.
3. CJ product feed fields → columns: `productName→title`, `manufacturer→publisher`, `price→list_price_cents`, `currency→currency`, `linkCode/clickUrl→affiliate_url`, `imageUrl→thumbnail_url`, `productUrl→product_url`, plus soft-classify `ensemble_type` from keywords in title/description (`chorus/choir` → choral, `band/wind` → band, `orchestra` → orchestra).
4. Nightly cron in `/opt/supabase/crons/` calls both advertisers.
5. UI: add `jwpepper` + `sheetmusicplus` to the source filter in `RepertoireSearchBar.tsx`.
6. Attribution + CJ disclosure line under result cards from these sources.

**Ship criterion:** ≥5,000 JWP rows + ≥5,000 SMP rows in `ext_catalog_items`, "Editor's Picks" shelf on Browse tab populated, and a Search for a known SMP title (e.g., "Prayer of the Children") returns the SMP row above CPDL/IMSLP.

---

## Phase 3 — Real Add-to-Library (in progress)

**Goal:** Replace the toast placeholders in `RepertoirePage` so "Add to My Music" and "Add to Library" actually persist. Directors can build a personal or tenant library from repertoire search results.

**Detail plan below → executing in this session.**

**Schema deltas:**
- `gw_personal_scores`:
  - Widen CHECK on `source` to include `'imslp'`, `'external'`.
  - `storage_path` DROP NOT NULL.
  - ADD `external_url text` — filled when we don't cache the PDF.
  - ADD `ext_catalog_item_id uuid REFERENCES ext_catalog_items(id) ON DELETE SET NULL`.
  - Partial unique `(user_id, ext_catalog_item_id) WHERE ext_catalog_item_id IS NOT NULL`.
  - CHECK (`storage_path IS NOT NULL OR external_url IS NOT NULL`).
- `gw_sheet_music`:
  - ADD `ext_catalog_item_id uuid REFERENCES ext_catalog_items(id) ON DELETE SET NULL`.
  - Partial unique `(tenant_id, ext_catalog_item_id) WHERE ext_catalog_item_id IS NOT NULL`.
  - `pdf_url` already nullable — set it to the source_page_url or product_url on external inserts.

**Client:**
- `src/lib/repertoire/api.ts` — add `useAddToMyMusic()` + `useAddToTenantLibrary()` TanStack mutation hooks that INSERT the appropriate row (RLS enforces user_id / current_tenant_id() — no RPC needed).
- `src/pages/dashboard/RepertoirePage.tsx` — swap toast placeholders for real calls with success/error toasts. Success toast has a "View in My Music" / "Open in library" link.

**Deferred (Phase 3.5):** lazy PDF caching to DO Spaces. When a user clicks "View" on a saved score whose `storage_path` is null, edge fn downloads the source PDF (CPDL only — IMSLP's 15-second countdown is a ToS issue for automated download), uploads to bucket, sets `storage_path`. Directors get the source URL to click through in the meantime.

**Ship criterion:** Save a CPDL row from Repertoire → appears in My Music tab; save from an IMSLP row → appears with a "Download from IMSLP" button; save a CPDL row to tenant library → appears in Music Library page for all tenant members. Dedupe: clicking Save twice on the same item shows "Already in your library" instead of an INSERT error.

---

## Phase 4 — Band + state prescribed music lists

**Goal:** Fill the band gap. Ingest Windrep.org (band-specific work database, no free API) and yearly-refreshed state prescribed music lists (TMEA / UIL / FBA / NYSSMA — the state MEA-published lists that determine what wins competitions).

**Sub-phase 4a — Windrep**
- Reach out to Windrep.org maintainers for a data partnership (they run a small volunteer wiki-style DB).
- If yes: sanctioned scrape. New edge fn `supabase/functions/ext-ingest-windrep/index.ts`. Category walk of the WindRep MediaWiki analog.
- Fields map to `ext_catalog_items`: title, composer, difficulty_grade, ensemble_type='band', source_page_url. WindRep exposes grade + duration which are big wins for band directors.

**Sub-phase 4b — State prescribed music lists**
- These lists are public HTML/PDF published by each state MEA yearly.
- One-off ingester per state: `supabase/functions/ext-ingest-state-list/index.ts` — body `{ "state": "TX" | "FL" | ... , "year": 2027 }`.
- Add `state_prescribed_lists` column (text[]) to `ext_catalog_items` — array of strings like `"TMEA-2027-Grade4-Concert"`. Then any work on multiple state lists is discoverable via `WHERE 'TMEA-2027-Grade4-Concert' = ANY(state_prescribed_lists)`.
- New UI filter: "Prescribed for" dropdown (state × grade). Immensely valuable to band/choral directors preparing for MPA / contest.
- Refresh cron runs annually in July after each state's release.

**Priority order for state lists:** TX (TMEA/UIL — huge in-network), FL (FBA), GA (GMEA — home turf), NY (NYSSMA), CA. That covers ~40% of US school music directors.

**Ship criterion:** WindRep partnership confirmed OR declined (either unblocks the scrape decision); TMEA + FBA + GMEA 2026-27 lists ingested; "Prescribed for" filter on RepertoirePage returns the correct works.

---

## Phase execution order

1. **Phase 3** (now) — makes Phase 1 actually useful.
2. **Phase 2** (when CJ creds land) — massive catalog jump + revenue.
3. **Phase 4** (any time after Phase 3) — closes the band gap.

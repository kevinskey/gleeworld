# Storefront nav consolidation + authorization gap — report

## STATUS: DONE

Commit: `69a3825cb0118a31ba73502d6a62b1060eac6023` (branch `feat/my-space-phase5`)

## Gates

- `npm run test`: 289/296 files passing. Failures = the 6 known baseline files (heroDrag, appDestinations `/all-state` case, v1_to_v2, WorkspaceSettingsPage.branding-general-upsert, NoteEditor, SightReadingStudio) plus `WorshipAidPage.test.tsx`, which I confirmed is pre-existing flakiness unrelated to this diff — it passed/failed non-deterministically across 3 isolated reruns with no code of mine touching liturgy/worship-aids. All new/edited tests (ProductManagement, legacyStoreRedirects, myTools MERGED_KEYS, navCatalog adminOnly) passed in every run and were each verified red-then-green by mutating the code they target.
- `npm run typecheck:guard`: OK — 151 errors, all pre-existing (baseline shrunk from 170 to 151; no new errors).
- `npm run lint`: pre-existing baseline is 4115 problems repo-wide (confirmed identical count via `git stash` on the unmodified branch); targeted `eslint` on every file I touched adds zero new errors (App.tsx's one pre-existing rules-of-hooks error at line 433 sits ~1500 lines from my edits, present before this change).
- `npm run build`: clean, succeeds.

## RLS observation (report only, not verified against live DB)

`gw_orders`, `gw_payments`, `gw_refunds`, `gw_disputes` were reachable from ProductManagement with no role check anywhere in the app layer (module-only nav gate, auth-only ProtectedRoute, no self-gate). Whether RLS policies on those tables would independently have blocked a non-admin's reads was not checked — the migration history is 2,377 files and the live self-hosted policy state is authoritative, not the migration files, so I did not attempt to verify it there.

---

## Fix round 1 (review response)

### STATUS: DONE

Commit: `1f1e10c1cabab8e5653356802248657719df860b` (branch `feat/my-space-phase5`)

### Important 1 — MERGED_KEYS resolution audit

Confirmed the reviewer's finding (stored `['merch']` → shelf `['shop']`, grid `primary: []`) and audited every consumer of stored tool keys for the same gap. Found four more beyond `getAppTiles`:

- `DashboardShell`'s `useAllToolsCatalog` — the All Tools sheet's "already pinned" check (`pinned: myTools?.tools ?? []`), so a stored `'merch'` made the sheet offer "Store Admin" as addable even though the member already had it.
- `MySpacePage`'s editor `tools` — rendered a stored `'merch'` as a dead "Unavailable" row (`MySpaceEditor`'s deliberate treatment for a truly-retired key with no live entry) while *also* listing "Store Admin" a second time in More Tools as freely addable, since `chosenKeys` never contained `'shop'`.
- `useTenantDefaultTools` — tenant-level per-role default shelves (`gw_tenant_nav_prefs.default_tools`), same raw-read shape, feeding the same `MySpaceEditor` in admin "Defaults for members" mode.
- A related but distinct bug in `getAppTiles`/`selectShelfEntries` themselves: neither deduped after resolving, so a record saved *before* the merge (when `'merch'` and `'shop'` were both independently pinnable) would resolve to two identical tiles, not one, on both surfaces.

Fix: added `resolvedTools()` (`myTools.ts`) — resolve+dedupe+cap via `sanitizeTools` — as the one helper every `myTools.tools` read site now goes through, and `resolveKeys()` (new `mergedKeys.ts`) — resolve+dedupe, no cap — inside `getAppTiles` and `selectShelfEntries` themselves. `MERGED_KEYS`/`resolveKey` moved out of `myTools.ts` into their own module (`mergedKeys.ts`) so `appDestinations.ts` could import them without a cycle (`myTools.ts` already imports `parseTileLayout` from `appDestinations.ts`); `myTools.ts` re-exports both for backward compatibility, no call site changed its import path.

`DEFAULT_GRID_ORDER` (`appDestinations.ts`): deliberately changed the trailing `'merch'` to `'shop'` rather than dropping the slot. Reasoning: this list is what a brand-new member's home grid shows on day one, and the pre-merge grid included Merch there — keeping the successor preserves that day-one visibility for the tenants that can still reach it. Since `'shop'` is now `adminOnly`, a non-admin's slot silently resolves to nothing (same "gate closed" behavior every other frozen-list entry already gets), and an admin gets Store Admin on their default grid, matching pre-consolidation behavior. Also routed both `DEFAULT_GRID_ORDER` lookups through `resolveKey` as a defensive backstop against the same class of bug on a future merge.

Removed the now-dead `D.merch` fixed-dict entry in `appDestinations.ts` (unreferenced by either tab-order list).

Tests added/updated, each verified red→green by mutating its target: `myTools.test.ts` (`resolveKeys`... via `resolvedTools`, `selectShelfEntries` dedup), `appDestinations.test.ts` (`getAppTiles` My-Tools-path resolve + dedup, `DEFAULT_GRID_ORDER` admin-gets-Store-Admin), `useTenantDefaultTools.test.tsx`, `DashboardShell.allTools.test.tsx` (sheet "already pinned"), `MySpacePage.test.tsx` (editor dead-row + duplicate), `HouseHome.test.tsx` (new grid-props-capturing describe block proving `gridCap` is 8, not 7, and the grid tile renders).

### Important 2 — query string dropped on redirect

Confirmed: `<Navigate to="/dashboard/shop">` drops `search`/`hash`. Added `RedirectPreservingQuery` (new file, `src/components/routing/RedirectPreservingQuery.tsx` — not inline in `App.tsx`, because importing `App.tsx` directly in a test pulls in its import-time `setupMobileAudioUnlock()` → `window.matchMedia` call, which this suite's jsdom has no polyfill for; every other page test in the repo wraps only the component under test for the same reason). It reads `useLocation()` and appends `search + hash` to the target before navigating. `App.tsx`'s two legacy routes now use it.

Replaced the source-scan test (`legacyStoreRedirects.test.ts`) with a behavioral one (`legacyStoreRedirects.test.tsx`): mounts the real `RedirectPreservingQuery` component under a real `MemoryRouter`/`Routes` tree and asserts the landed URL for bare, `?query`, `#hash`, and `?query#hash` cases. Kept one small secondary regex check (clearly labeled as secondary, not the proof) confirming `App.tsx`'s two routes are still wired to this exact component, so "wired to something else" drift is still caught.

### Minors

- `ControlCenter.tsx` and `Shop.tsx`'s "back to admin"/"Store" links now point at `/dashboard/shop` directly instead of the retired paths.
- `navCatalog.test.ts` now pins the `'shop'` entry's label to `'Store Admin'`, distinct from `'music-store'`'s `'Music Store'`.
- `ProductManagement.test.tsx`'s `h.roleLoading` reset moved from the end of a test body into `beforeEach`/`afterEach` (plus `isAdmin`/`hasStore`/`moduleLoading` reset for full isolation), so a failing assertion above the old reset can no longer leak state into the next test.

### Delegation question (LibrarianDashboardPage honours app_roles; ProductManagement's gate is isAdmin() only)

I believe `isAdmin()`-only is the right call for *this* fix, not a gap to close in the same pass. Reasoning:

- Before this fix there was no delegation mechanism for store operations at all — no `app_roles` value, no grant UI, nothing analogous to `hasLibrarianAppRole`/`hasWardrobeAppRole`/`hasSecretaryAppRole` in `useUserRole.ts`. Every non-admin who could reach `ProductManagement` was reaching it by the bug, not by a designed delegation a tenant deliberately set up. Closing it to admin-only doesn't regress a real feature; it removes an accidental side effect of the hole.
- The codebase's own precedent splits two ways: `app_roles` delegation (librarian, wardrobe, secretary) is reserved for operational, non-financial workflows. Money-adjacent tenant-admin surfaces — Fees (`fees-admin`, `gate: { adminOnly: true }`) and Box Office (`gate: { module: 'box_office', adminOnly: true }`) — are both bare admin-only today, no delegation escape hatch. `ProductManagement` composes orders/payments/refunds/disputes/discounts/tax, which sits with Fees and Box Office, not with Librarian/Wardrobe.
- If a tenant genuinely wants to delegate store operations to a trusted non-admin (a booster-club treasurer, say), that's a reasonable follow-up feature — a new `app_roles` value, a grant UI, and a `canManageStore`-style flag threaded through `NavGate`/`NavContext` the same way `librarianOnly` works — but it's new product surface, not part of closing an authorization hole, and the task scope explicitly excluded RLS/migration work. I did not build it.

### Recorded, not acted on: /shop has no nav catalog entry

The reviewer's note is confirmed and sharpened by this round's fix: `ProductManagement` has a "View public store" link to `/shop?from=admin` (and `Shop.tsx` has a "Back to Store admin" link the other way) — before this fix, any authenticated member could reach `/shop` via that path since `ProductManagement` was open to everyone. Now that `ProductManagement` is admin-gated, a non-admin member has **no nav path to `/shop` at all** — it was never its own catalog entry, only reachable through the admin screen's outbound link or a direct URL. This is a pre-existing product gap (the buyer-facing storefront was never wired into `NAV_CATALOG`) that closing the security hole makes more visible, not something this fix introduced. Flagging for follow-up; did not add a catalog entry for it since that's a product decision (label, section, icon, whether it's tenant-store-module-gated) outside this task's scope.

---

## Fix round 2 (final item)

### STATUS: DONE

Commit: `8a9baef21e267ff221c8b6b1c9210afdb11595f2` (branch `feat/my-space-phase5`)

`useMyTools.ts`'s `pinTool` checked `record.tools.includes(resolved)` — the RESOLVED incoming key against the RAW stored array. A record still holding a retired key (e.g. `'merch'`, merged into `'shop'`) never contains the literal string `'shop'`, so `pinTool('shop')` missed the already-pinned check and appended a redundant second entry — `['merch', 'shop']`, two keys resolving to the same destination, one of the member's eight slots burned on a duplicate. Unreachable through the shipped UI today (`useAllToolsCatalog`'s `pinned` list already runs through `resolvedTools`, so Store Admin isn't offered as pinnable once `'merch'` is stored) but a real latent duplicate — exactly the class of bug the whole round-1 fix was about: resolution wired to some call sites and not others.

Fixed by comparing `resolveKeys(record.tools)` (the same shared helper `getAppTiles`/`selectShelfEntries` already use) against `resolved`, instead of the raw array. `resolveKeys` re-exported from `myTools.ts` alongside `MERGED_KEYS`/`resolveKey` so `useMyTools.ts` didn't need a second import path.

Added `useMyTools.test.tsx`: a record storing `['merch', 'calendar']`, `pinTool('shop')` — asserts `ok === true` (already-pinned) and `rpc` is never called. Verified red→green: reverting the check back to `record.tools.includes(resolved)` makes this exact test fail with the RPC called once, `tools: ['shop', 'calendar']` — confirming the duplicate write the fix prevents.

### Gates

- `npm run test`: 289/296 files passing (2 consecutive full runs), no failures beyond the 7 known baseline files (heroDrag, appDestinations `/all-state` case, v1_to_v2, WorkspaceSettingsPage.branding-general-upsert, WorshipAidPage, NoteEditor, SightReadingStudio).
- `npm run typecheck:guard`: OK — 151 errors, all pre-existing (baseline: 170).
- `npm run lint`: zero errors on every touched file (`useMyTools.ts`, `useMyTools.test.tsx`, `myTools.ts`).
- `npm run build`: clean.

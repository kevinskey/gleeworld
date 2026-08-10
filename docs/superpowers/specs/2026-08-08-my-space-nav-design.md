# My World — navigation recut & personal setup screen

> **Renamed 2026-08-09.** "My World" became **My World** — the product owner's call. The
> route moved from `/dashboard/my-world` to `/dashboard/my-world` (the old path redirects,
> preserving query and hash). This file keeps its original dated filename because it is a
> historical record; only its title and body copy were updated. The same date also retired
> the 8-tool cap — see §2 and §5.2.

**Date:** 2026-08-08 · **Status:** Approved design, pre-implementation
**Builds on:** `2026-07-04-house-and-stage-design.md` (House = iOS light), `2026-07-06-apple-ios-design-system-design.md` (locked visual language), `2026-07-06-home-tile-customization-design.md` (keycap jiggle edit), `2026-07-06-nav-catalog-parity-design.md` (the catalog itself)

## 1. Summary

When a member signs in, GleeWorld should feel like *their* space — everything they need,
where they left it. Today the app contradicts itself: `HouseHome` renders a warm, personal
room at `/dashboard`, and the sidebar beside it lists **52 destinations across 10
collapsible sections**, announcing that the user's real work is somewhere else.

This spec does three things:

1. **Recuts the nav elements.** One rule — *a nav element is a place you go to do recurring
   work* — collapses role-split twins, folds views back into their parents, and moves
   configuration surfaces into Settings. ~52 top-level entries become ~18.
2. **Merges the two personalization systems into one.** `home_tile_layout` and
   `nav_item_order` are two mental models for one idea. They become **My Tools**: a single
   ordered set, rendered as keycaps in the room and as rows in the sidebar.
3. **Adds `/dashboard/my-world`** — an iOS-Settings-shaped screen where a member arranges
   their tools and widgets, instead of drag-sorting the live sidebar. The same component,
   presented as a sheet, is the first-run picker.

Usage telemetry ranks *what you're offered* — Suggestions, seeded defaults, nudges — and
never reorders what you've already placed.

**The bet:** a space feels like home because your things are where you left them, and
because you chose them.

## 2. Goals / non-goals

**Goals**

- A persistent nav that **starts short and is the member's to grow**. It is seeded with 8
  tools and never imposes a limit after that. *(Revised 2026-08-09, the product owner's
  decision. The original goal read "a persistent nav that can never grow into a list,
  whatever the tenant enables." That was right while the shelf was the ONLY way to reach a
  destination — an overfull shelf meant an unusable nav. All Tools and ⌘K changed the
  premise: everything in the catalog is one tap away regardless of shelf length, so length
  became a choice rather than a trap, and a hard cap became the app overruling the member
  about their own nav for no remaining reason. The other original justification — never
  truncate an existing tile set during migration — is spent; everyone has migrated.)*
- One personal tool set, arranged once, rendered consistently on every surface.
- A setup screen that reads like iOS Settings, not a configuration table.
- First-run defaults earned from real usage rather than guessed.
- Delete the drift: a dead second nav taxonomy, a second personalization system, and
  the accordion machinery.

**Non-goals (kill list)**

- ❌ Auto-sorting the shelf by frequency. Decided 2026-08-08 — usage informs offers, never
  placement. Muscle memory is the feature.
- ❌ A third personalization concept. My Tools replaces both existing ones; it does not
  join them.
- ❌ Rounded translucent "launcher" chrome. The Apple spec is locked: white cards on
  `#F2F2F7`, `--radius: 12px`, hairline separators, one shadow token.
- ❌ Rebuilding the room. `HouseHome`'s greeting / up-next / widgets / keycaps structure
  stays exactly as shipped; only its tile source changes.
- ❌ Cross-tenant usage aggregation. Suggestions and seeded defaults are computed within a
  single tenant.
- ❌ Any service worker involvement (standing platform rule).

## 3. The problem, with evidence

| Observation | Where |
|---|---|
| 52 catalog entries across 10 sections, all sidebar-eligible | `src/lib/navigation/navCatalog.ts` |
| Sidebar renders them as 10 collapsible sections with press-and-hold drag reorder | `src/components/dashboard/DashboardShell.tsx` (1,191 lines) |
| Seven sections force-collapsed on every load to keep the drawer usable | `DEFAULT_COLLAPSED`, same file |
| A second personalization system with a different gesture and a different store | `useHomeTileLayout` / `HomeTileGrid.tsx` |
| A **third, dead** nav taxonomy — 6 groups, ~24 items, routes that no longer exist | `src/components/navigation/AppNavigation.tsx`, imported at `UniversalHeader.tsx:17` and never rendered |
| Nothing anywhere records which destinations members actually open | — |

The force-collapse is the tell. `DEFAULT_COLLAPSED` exists because nine expanded groups made
the drawer unusable — the current design is already being managed around rather than fixed.

## 4. Recutting the nav elements

### 4.1 The rule

> **A nav element is a place you go to do recurring work.**
> - Configure it once → **Settings**.
> - A view *of* another thing → lives **inside** that thing.
> - Same destination, different role's content → **one** element, role-shaped.

### 4.2 Applying it

**Role-split twins collapse.** Each pair/quartet becomes one entry whose page renders the
right content for the viewer — the gate logic already exists in `resolveNav`, it just runs
one level deeper.

| Today | Becomes |
|---|---|
| `all-state`, `all-state-cohorts`, `my-all-state`, `all-state-admin` | **All-State** |
| `my-fees`, `fees-admin` | **Fees** |
| `box-office` (`/dashboard/box-office`), `tickets` (`/box-office`) | **Box Office** |
| `shop` (`/dashboard/shop`), `merch` (`/store/products`), plus the unlisted `/product-management` | **Store Admin** — one entry, one route |

**Corrected 2026-08-09 after reading the routes.** This was written from route names and
was wrong. There are not four storefronts:

- `/store` renders `StoreShell` → `StorePage` — the buyer-facing marketplace. Keeps its
  own entry; browsing and administering are different jobs.
- `/dashboard/shop`, `/store/products`, and `/product-management` all render the **identical**
  `ProductManagement` component. That is the real duplication: one admin page behind three
  URLs, surfaced as two differently-labelled catalog entries (`shop` "Store" in Reach,
  `merch` "Merch" in Reach) so a member sees two features and lands on one screen. Collapse
  to one entry on one route; retire the other two as redirects, resolving their keys through
  `MERGED_KEYS` so no stored layout is rewritten.
- `/dashboard/fundraising` is **not a storefront we run** and must not be merged in.
  `FundraisingStoreSection` calls `provision-tsb-store` to create a T-Shirt Brothers group
  store and `tsb-store-sso` to mint a one-click admin login; TSB holds the catalog, fulfils
  the orders, and collects the money, and the tenant keeps 15%. None of the commerce-core
  rules in `.claude/skills/gleeworld-commerce` apply, because GleeWorld never touches the
  goods or the money. Merging it under "Store" would tell a director they were managing
  their own inventory. It stays a separate entry under Money, labelled
  **Fundraising (T-Shirt Brothers)** (Kevin, 2026-08-09) so the partner relationship is
  legible from the nav.

**Views fold into their parents.**

| Today | Becomes |
|---|---|
| `music` (Viewer) | opened *from* **Music** |
| `worship-aids` | a tab inside **Liturgy** |
| `practice` | a tab inside **Academy** |

**Configuration moves to Settings.** These are monthly-or-rarer authoring and admin
surfaces currently competing with Calendar for attention:

`site-setup`, `partners`, `analytics`, `settings`, `qr-codes`, `fan-page`, `graduates`,
`parents`, `tenants`, `librarian`, `partner-portal`

`fan-page` and `graduates` are the clearest case — both are page builders for the *public*
site and belong beside the existing Site Setup at `/admin/public-page`.

### 4.3 Result

~52 top-level entries → **~18**, of which up to 8 sit in any one member's space. Sections
survive only inside All Tools, where browsing is the point.

**Implementation note.** `CatalogEntry.key` is stored in user preferences and **must never
be renamed** (existing constraint, `navCatalog.ts:5`). Merges therefore keep the surviving
entry's existing key and add the retired keys to a `MERGED_KEYS: Record<string, string>` map
so stored layouts referencing a retired key resolve to its successor instead of silently
vanishing.

The map ships **empty in Phase 1**, with the resolver that consults it written at the same
time. Phase 5 then fills it as each merge lands, and no stored layout ever has to be
rewritten — resolution happens on read.

## 5. Surfaces

### 5.1 The Room — `/dashboard` (`HouseHome`)

Unchanged in structure: greeting, up-next plate, two role widgets, keycap grid. The only
change is that the keycap grid reads **My Tools** instead of `home_tile_layout`.

This is the destination, not a lobby. On a normal day a member lands, sees the up-next
strip, taps into the work, and never touches navigation at all.

### 5.2 The Shelf — the sidebar

Flat. No sections, no headers, no accordions, no drag targets.

```
┌──────────────────┐
│   [ tenant logo ]│
│                  │
│  ⌂  Home         │ ← always, doesn't consume a slot
│  ▤  Calendar     │
│  ♪  Music        │   your My Tools set,
│  🎓 Academy      │   in your order,
│  ✉  Messages     │   as many as you keep
│  ▦  Programs     │
│  💲 Finance      │
│                  │
│  ⊞  All Tools    │ ← always
│  ⚙  Setup        │ ← always
└──────────────────┘
```

**No ceiling.** A member is *seeded* with 8 tools (which is also what the shipped keycap
grid seeded, so migration never truncates an existing tile set) and may add or remove
freely from there. The shelf renders exactly what they chose.

*Revised 2026-08-09, the product owner's decision.* This section previously asserted
"Ceiling: 11 rows. Cap is 8, not 6." The cap is gone: `sanitizeTools` no longer truncates
at 8, `NavShelf` no longer slices its render, and the ⊕ affordances in the editor, the All
Tools sheet and the keycap grid are never disabled. What survives is `MY_TOOLS_SANITY_MAX`
(64, matching `parseTileLayout`) — corruption protection so a hand-edited or corrupt record
cannot render unbounded rows, never reachable in normal use. Both role defaults stay
exactly `MY_TOOLS_SEED_SIZE` (8) long. Both callers put the shelf inside a
`flex-1 overflow-y-auto` `<nav>`, so a long shelf scrolls within the sidebar or drawer
instead of growing the page.

Gates still run on top of the shelf: an entry whose module or role gate closes simply does
not render, and is dropped from the rendered set without being removed from the stored one
(so a re-enabled module restores it).

The mobile drawer renders the same shelf. `MobileBottomNav` keeps its own 5 role-aware tabs
per House §5.2 — including the module gating that spec noted is still missing.

### 5.3 All Tools — the one door

A sheet over the page, opened from the shelf or ⌘K, holding the full recut catalog.

```
┌────────────────────────────────────────────────┐
│  🔍  Search all tools…                         │
│                                                │
│  YOU USE MOST                                  │
│   ▦ Programs   🎫 Box Office   ♪ Music    ⊕    │
│                                                │
│  MUSIC                                         │
│   ♪ Music              ⊙ Part Tracks     ⊕    │
│   ▣ Media Library ⊕    ⊞ Store           ⊕    │
│                                                │
│  TEACH · MAKE · PLAN · REACH · MONEY · PEOPLE  │
└────────────────────────────────────────────────┘
```

- **Search is the real navigation.** With the catalog behind a door, typing `seat` must land
  on Seating Charts immediately. Matches label and section name, case- and
  diacritic-insensitive.
- The **YOU USE MOST** row needs `gw_nav_usage` and therefore arrives with Phase 4; until
  then the sheet opens straight to the sections and the row is absent, not empty.
- **⊕ pins to My Tools in place** and updates the room and shelf at once. It is never
  disabled for length and there is no "full" banner — *revised 2026-08-09 with the cap
  removal (§2, §5.2)*. (This bullet previously read: "With 8 already placed, every ⊕ is
  disabled and the sheet says so — 'Your space is full — remove one in Setup to pin
  another.'" Before that it read "⊕ prompts to swap rather than failing silently". The plan
  ratified the substitution — a swap picker
  is a second modal decision inside a sheet the member opened to do something else, where
  Setup already exists for exactly that edit. What matters is the "rather than failing
  silently" half, and it holds: the state is visible before the tap, not discovered after
  it.) A ⊕ is likewise withheld — not shown disabled — before the member's stored record has
  loaded, because the write path refuses in that state. Home carries the non-pinnable
  "In your space" affordance instead of a ⊕: it is always on the shelf and is never stored.
- Visual: `--card` rows on `--background`, 12px radius, hairline separators, tint on the
  ⊕ badge only. Blur is permitted here (fixed chrome, ≥85% opaque scrim) but not required.

### 5.4 My World — `/dashboard/my-world`

The model is **iOS Settings → Control Center**: an included list with ⊖ badges and drag
handles, an available list grouped in inset cards with ⊕ badges, over a live preview.

```
‹ Settings              My World                   Done

     ┌───────────────────────────────────────┐
     │   ▤   ♪   🎓   ✉   ▦   💲             │  live preview
     │  Cal Mus  Acad Msgs Prog Fin          │
     └───────────────────────────────────────┘

  IN YOUR WORLD                                 6 tools
 ┌─────────────────────────────────────────────────────┐
 │  ⊖   ▤   Calendar                              ≡    │
 │  ⊖   ♪   Music                                 ≡    │
 │  ⊖   🎓  Academy                               ≡    │
 │  ⊖   ✉   Messages                              ≡    │
 │  ⊖   ▦   Concert Planner                       ≡    │
 │  ⊖   💲  Finance                               ≡    │
 └─────────────────────────────────────────────────────┘
   Home is always here.

  MORE TOOLS
   Music
 ┌─────────────────────────────────────────────────────┐
 │  ⊕   ⊙   Part Tracks                                │
 │  ⊕   ▣   Media Library                              │
 └─────────────────────────────────────────────────────┘

  WIDGETS                                        2 of 2
 ┌─────────────────────────────────────────────────────┐
 │  ✓   Needs You                                      │
 │  ✓   Today                                          │
 │      Practice Ledger                                │
 └─────────────────────────────────────────────────────┘
```

Type scale from the Apple spec: `--font-body` (17px) rows, `--font-footnote` (13px)
captions, `--font-title-2` group headers. 44pt rows. Tenant color appears only as the tint
on ⊕ / ✓ badges. Drag handles use the same `@dnd-kit` setup being removed from the sidebar —
the dependency stays, it just moves to the screen where sorting is the task.

**Admin mode.** For tenant admins the screen gains a segmented control:

```
        ┌──────────┬──────────────────────┐
        │   Mine   │ Defaults for members │
        └──────────┴──────────────────────┘
                     ├ Admins ┼ Students ┼ Members ┤
```

Same editor; the right-hand mode writes tenant defaults per role instead of the personal
record.

The per-role hide list (Workspace Settings → Navigation) **stays where it is.** The original
design folded it into this screen, but hiding is route-based and orthogonal to shelves —
and removing a shipped admin control is not something a nav redesign should do on the way
past. What shipped instead (Phase 2): the hide list keeps its editor, and its panel gains a
card above it linking here — heading *Default tools for each role*, body *Set what new
members start with in My World → Defaults for members.* The two controls compose: an item
withheld from a role never reaches that role's ⊕ pool, because `hiddenRoutes` is part of the
same `NavContext` this screen resolves.

**First run.** On first login the same component renders as a sheet, pre-filled with the
tenant default for that member's role, titled *"Set up your space."* Confirm or adjust.
Skipping accepts the default — never an empty space.

### 5.5 Naming

`/admin/public-page` (**Site Setup**) configures the site strangers see. `/dashboard/my-world`
(**My World**) configures the space members live in. Parallel doors, parallel names.

## 6. Data model

### 6.1 My Tools

Extend the existing `user_preferences.nav_item_order` JSON to `v: 4`:

```ts
interface MyTools {
  v: 4;
  /** ordered catalog keys, member-chosen length. 'home' is implicit and never stored. */
  tools: string[];
  /** chosen role widgets, max 2 (House §5.1 cap) */
  widgets: string[];
  /** true once the member has seen the first-run sheet */
  setupComplete: boolean;
}
```

`parseNavOrder` keeps accepting v1–v3 and migrates on read (§6.3). Writes continue through
the **`save_nav_item_order` SECURITY DEFINER RPC** (migration
`20260729180000_save_nav_item_order_rpc.sql`) — a direct upsert 403s whenever the caller's
subdomain-derived `current_tenant_id()` disagrees with the row's stored `tenant_id`, which
is common now that `current_tenant_id()` is subdomain-aware. The RPC also resyncs
`tenant_id` on every save. **Do not replace it with a direct upsert.**

`home_tile_layout` is read once by the migration, then retired.

### 6.2 Tenant defaults

`gw_tenant_nav_prefs` gains `default_tools text[]`, alongside the existing `hidden_items`, on
the same `(tenant_id, role)` row rather than a `{ admin: [], student: [], member: [] }` jsonb
blob — the table is already `PRIMARY KEY (tenant_id, role)`, one row per role, so a role-keyed
blob would nest role inside a row already partitioned by role, and every write would have to
read-modify-write the other roles' data to avoid clobbering it. Empty array means "no tenant
default set", falling back to the platform role default; `NULL` is not used. Written only by
tenant admins, read by the first-run sheet and by any member with no personal record.

### 6.3 Migration of existing preferences

Per user, in order of preference:

1. `home_tile_layout.order` exists → use it WHOLE after sanitizing (a curated pick list,
   including a deliberately empty one). `setupComplete: true`. *(Revised 2026-08-09: this
   read "first 8 after sanitizing". Truncating a member's own curated pick list is exactly
   the silent drop the cap removal ends.)*
2. Else → the tenant default for their role.
3. Else → the platform default for their role, `setupComplete: false`.

Retired keys resolve through `MERGED_KEYS` before any of the above. `setupComplete` is set
`true` only for a member with a curated tile layout, so the first-run sheet greets everyone
else.

> **Amended 2026-08-08 (final review, I3).** An earlier step between 1 and 2 — "else
> `nav_item_order.order` (v1–v3) → first 8 keys" — has been **dropped**, and
> `migrateToMyTools` no longer reads legacy nav orders at all. That column never held a
> pick list: the old sidebar stored the ENTIRE flat display order of every visible entry
> (~40 keys), so "first 8" was top-of-catalog order, not preference. A typical school admin
> would have migrated to `messages, calendar, notes, concierge, bible, music-library, music,
> sight` — no Academy, People, Finance or Concert Planner — and `setupComplete: true` would
> then have skipped them past Phase 2's first-run sheet. They now fall through to the role
> default with `setupComplete: false` instead. Nobody loses a tool they deliberately
> **placed**; a tile layout is still honoured verbatim.

### 6.4 Usage telemetry

```sql
create table gw_nav_usage (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null default current_tenant_id(),
  user_id     uuid not null,
  nav_key     text not null,
  hit_count   integer not null default 0,
  last_at     timestamptz not null default now(),
  unique (tenant_id, user_id, nav_key)
);
```

Standard platform requirements apply and are not optional: `tenant_id` default plus the
BEFORE INSERT trigger, RESTRICTIVE tenant-isolation RLS, and a user-scoped policy so a
member reads only their own rows. Aggregates for admin defaults are exposed through a
`SECURITY DEFINER` function that returns counts per role without exposing individual rows.

Recorded fire-and-forget on navigation, debounced to at most one write per key per minute
per session. Failures are swallowed — telemetry must never block or surface an error.

### 6.5 Where usage is allowed to act

| Surface | Usage-driven? |
|---|---|
| **Suggestions** row, top of All Tools | ✅ most-used, trailing 30 days |
| **Tenant default** shelves offered to new members | ✅ aggregated per role within the tenant |
| **Nudge** — *"You've opened Seating Charts 14 times this month. Add it?"* | ✅ offers; one tap to accept |
| The shelf itself | ❌ **never reorders on its own** |
| The keycap grid | ❌ **never reorders on its own** |

Nudge rules: at most one live at a time, at most one per fortnight, dismissible, and never
re-offered for a tool dismissed twice.

## 7. Visual language

Entirely inherited from `2026-07-06-apple-ios-design-system-design.md`. No new tokens.

- `--background` `#F2F2F7`, `--card` `#FFFFFF`, `--radius` 12px (already live at
  `src/index.css:424`), one `--shadow-card` token, hairline `--border` separators.
- Tenant brand appears only as the system tint: ⊕ / ✓ badges, active shelf row, the up-next
  fuse. Everything else neutral.
- System font stack; `--font-body` 17px rows, `--font-footnote` 13px captions.
- Press feedback `active:opacity-60` on rows, `active:scale-[0.97]` on keycaps.
- 44pt minimum targets throughout.

House's `--radius: 0` / cream-canvas language is superseded and does not apply.

## 8. What this deletes

| Removed | Lines / reason |
|---|---|
| `src/components/navigation/AppNavigation.tsx` | 293 lines, dead — imported at `UniversalHeader.tsx:17`, never rendered. Remove the import too. |
| `SortableNavRow`, `DroppableSection`, sidebar dnd wiring | `DashboardShell.tsx` — sorting moves to My World |
| 10 collapsible sidebar sections + `DEFAULT_COLLAPSED` + `loadCollapsed` | Nothing left to collapse |
| `buildNavSections` section-grouping and `sectionOrder` handling | Shelf is flat |
| `useHomeTileLayout` and the `home_tile_layout` column | Superseded by My Tools |
| ~~Workspace Settings → Navigation panel body~~ | **Not deleted.** The hide-list editor stays; the panel gained a link card to `/dashboard/my-world` above it. See §5.4 — hiding is route-based and orthogonal to shelves. |
| ~34 catalog entries | Merged, folded, or moved to Settings (§4) |

**Kept deliberately:** the iOS jiggle-edit on the keycap grid. It is the Apple pattern, it is
already shipped, and it now edits the same My Tools record the setup screen does. Long-press
to nudge one tile; open My World to actually arrange things.

## 9. Phasing

- **Phase 1 — My Tools + the shelf.** Data model, migration, flat sidebar, keycaps read My
  Tools, dead code deleted. The visible win: the sidebar stops being a list.
- **Phase 2 — My World + first run.** The setup screen, the admin defaults mode, the
  first-run sheet, and a link card from Workspace Settings → Navigation (not a redirect —
  see §5.4).
- **Phase 3 — All Tools + search.** The launcher, ⌘K, in-place ⊕ pinning.
- **Phase 4 — Usage.** `gw_nav_usage`, Suggestions row, seeded tenant defaults, nudges.
- **Phase 5 — The catalog recut.** Merges, folds, and the Settings migration. Last on
  purpose: by then Phase 4 telemetry says which entries anyone actually opens, so the
  final culling is evidence-based rather than a judgment call.

Phases 1–3 are independently shippable and each stands on its own.

## 10. Acceptance tests

1. **The shelf never exceeds 11 rows** for any role in any tenant, including a tenant with
   every module enabled and a platform super-admin signed in.
2. **No member loses a tool.** Migration dry-run over production `user_preferences`: every
   pre-existing `home_tile_layout.primary` key resolves to a placed tool or a documented
   `MERGED_KEYS` successor. Zero silent drops.
3. **Gates hold.** A student in a tenant with every module on sees no admin-gated entry in
   the shelf, All Tools, search results, or Suggestions. Extends
   `src/lib/navigation/__tests__/navCatalog.test.ts`.
4. **Search finds everything.** Every entry in the recut catalog is reachable by typing a
   prefix of its label; asserted by iterating the catalog in a test, not by sampling.
5. **The shelf does not move.** With telemetry seeded so one tool dominates, the shelf order
   is byte-identical before and after. Regression guard on the core promise.
6. **Tenant isolation.** A member of tenant A cannot read `gw_nav_usage` rows for tenant B,
   nor influence tenant B's seeded defaults. Verified against the live self-hosted DB.
7. **One-handed at 390×844**, `prefers-reduced-motion` on, iOS accessibility text XL: My
   Space is fully operable, no clipped labels, drag reorder works by touch.
8. **AA contrast** on My World and All Tools under worst-case tenant palettes
   (`#FFFF00`, `#F8F8F8`, navy/gold + serif).

## 11. Open questions

- **Store reconciliation (§4.2).** Four routes — `/store`, `/dashboard/shop`,
  `/store/products`, `/dashboard/fundraising` — need one information architecture before
  Phase 5. This is a product decision about the storefront, not a nav decision, and may
  warrant its own brainstorm.
- **⌘K scope.** Whether the launcher's search stays nav-only or eventually searches content
  (scores, events, people). Nav-only for v1; the sheet is built so content sources can be
  added as additional result groups.
- **`MobileBottomNav` module gating** — noted as missing in House §5.2 and still missing.
  Fix inside Phase 1 or track separately.

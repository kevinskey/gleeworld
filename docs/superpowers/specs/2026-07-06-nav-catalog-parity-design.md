# Shared nav catalog + home-grid sidebar parity — design

Date: 2026-07-06
Status: Approved
Builds on: docs/superpowers/specs/2026-07-06-home-tile-customization-design.md (shipped, PR #59)

## Problem

The home grid's tile pool knows only 10 destinations, so users who pin
everything see "More — Everything is on your grid" while their sidebar
lists ~25 destinations (Music Library, Video, Music Tools, Office Hours,
Liturgy Planner, Tour Manager, Auditions, PR Hub, Fan Page, Feeds, Store,
Graduates, Box Office, People, Site Setup, Analytics, Settings…).

Root cause: the nav catalog is hand-maintained in three places —
`DashboardShell.tsx` desktop sidebar (~line 265), a verbatim second copy
in the same file for the mobile drawer (~line 515), and the grid's own
`D` map in `appDestinations.ts`. The copies drifted.

## Decisions

- **Full sidebar parity**: anything visible in the user's sidebar is
  pinnable, gated identically (module access + role + tenant hidden-nav).
- **Only the More pool grows**: uncustomized users keep today's exact
  default grid; every new destination lands in More.
- **One shared catalog** consumed by all three surfaces — no fourth copy.

## 1. The catalog (`src/lib/navigation/navCatalog.ts`)

Pure data + a pure resolver; no hooks, no components.

```ts
export type NavSectionKey =
  'today' | 'music' | 'teach' | 'make' | 'plan' | 'reach' | 'money' | 'people' | 'admin';

export interface NavGate {
  module?: string;          // v_tenant_active_modules key, e.g. 'pr_hub'
  moduleAny?: string[];     // Store: ['merch', 'store']
  adminOnly?: boolean;      // isTenantAdmin
  platformAdminOnly?: boolean; // super-admin on 'main' tenant only
  librarianOnly?: boolean;  // userCanLibrarian (module gate stays separate)
}

export interface CatalogEntry {
  key: string;              // STABLE slug — stored in saved layouts; never rename
  to: string;
  label: string;            // sidebar label
  gridLabel?: string;       // shorter grid word when it differs (e.g. 'Programs')
  icon: LucideIcon;
  section: NavSectionKey;
  tone: string;             // sidebar icon-tile classes
  tourId: string;
  hero?: boolean;
  end?: boolean;
  surfaces?: Array<'sidebar' | 'grid'>; // default: both
  gate?: NavGate;           // absent = flagless core
}

export const NAV_CATALOG: CatalogEntry[];

export interface NavContext {
  hasModule: (key: string) => boolean;
  isTenantAdmin: boolean;
  isPlatformAdmin: boolean;
  canLibrarian: boolean;
  hiddenRoutes: ReadonlySet<string>; // from useTenantNavPrefs
}

export function resolveNav(ctx: NavContext): CatalogEntry[];
```

Content rules:

- One entry per current sidebar item, values (route, label, icon, tone,
  tourId, hero, gating) copied **verbatim** from today's
  `DashboardShell` arrays. Gates: Practice and Fan Page `adminOnly`;
  Box Office `module: 'box_office'` + `adminOnly`; Librarian
  `module: 'librarian'` + `librarianOnly`; Store
  `moduleAny: ['merch','store']`; Tenants `platformAdminOnly`; Site
  Setup `adminOnly`; the rest per their `useModuleAccess` key or
  flagless.
- The grid's existing 10 destinations keep their exact keys, routes,
  and labels (`music`→`/dashboard/viewer` "Music", `tickets`→
  `/box-office` "Tickets", `merch`→`/store` "Merch", etc.) so saved
  layouts and current tiles behave identically. Where the sidebar has a
  *different route* for a related concept (Box Office
  `/dashboard/box-office`, Store `/dashboard/shop`, People
  `/dashboard/users`), that is a **separate catalog entry** — both are
  legitimate destinations; the grid dedupes by route as today.
- `attendance` is grid-only (`surfaces: ['grid']`) — the sidebar never
  showed it. `home`/`messages`/`schedule` tab destinations are
  sidebar/tab-only, never grid candidates.
- Keys for new entries are kebab/short slugs (e.g. `music-library`,
  `office-hours`, `pr-hub`, `box-office-admin`, `people-directory`).

`resolveNav` applies gates then filters `hiddenRoutes`. Pure function →
unit-tested per gate type.

## 2. Consumers

**DashboardShell (desktop sidebar + mobile drawer).** Both inline
`sections` arrays are deleted. Each surface calls `resolveNav` with a ctx
built from its existing hooks (`useModuleAccess` per key is replaced by
one `hasModule` lookup; role bits and `useTenantNavPrefs` unchanged),
then groups entries by `section` into the existing render shape
(label + items). Section labels, ordering, tones, tourIds, hero row,
collapse persistence, and empty-section hiding are unchanged — the
refactor must render **pixel-identically** for every role/flag combo.

**Home grid (`getAppTiles`).** Candidate pool = `resolveNav(ctx)`
filtered to grid surfaces, minus routes claimed by the tab bar.
`DEFAULT_GRID_ORDER` (the current 10-key preference order) is kept: with
no custom layout, primary = first 8 enabled keys of that order and
overflow = everything else enabled — so today's default grid is
byte-identical and ALL newly-pinnable destinations start in More. With a
custom layout, reconciliation works as shipped (saved keys in order,
stale keys drop silently, rest to overflow).

**More section grouping (edit mode).** With ~20+ addable tiles, the
edit-mode More area groups tiles under small uppercase section labels
(Music / Teach / Make / Plan / Reach / Money / People / Admin), in
catalog section order; empty sections are hidden. The view-mode More
expander stays a flat grid as today. Grid tiles show `gridLabel ?? label`.

## 3. Gating inputs & compatibility

- `toModuleFlags` (or a sibling) exposes `hasModule(key)` backed by the
  same `useTenantModules` rows, covering the new keys (`feeds`, `pr_hub`,
  `alumni`, `auditions`, `librarian`, `tour`, `liturgy_planner`,
  `viewer`, `sight_reading`, `part_tracks`, `studio`, `academy`,
  `box_office`, `concert_planner`, `merch`, `store`, `finance`).
  Existing `ModuleFlags` consumers keep working.
- `HouseHome` builds the grid's `NavContext` from `useTenantModules` +
  `useUserRole` (isTenantAdmin/isPlatformAdmin/canLibrarian) +
  `useTenantNavPrefs`. The grid renders only after modules AND layout
  load (shipped guard); nav-prefs loading follows the same pattern.
- Saved layouts: existing keys unchanged → old jsonb orders resolve
  identically. Unknown keys keep dropping silently. `home_tile_layout`
  schema unchanged — no migration in this project.

## 4. Error handling

- `resolveNav` is total: missing ctx fields are treated as false/empty
  (most-restrictive), so a loading hiccup can only under-show, never
  leak a gated destination.
- Hidden-nav prefs failing to load = empty set (same as sidebar today).

## 5. Testing

- Unit: `resolveNav` per gate type (module, moduleAny, adminOnly,
  platformAdminOnly, librarianOnly, hiddenRoutes, flagless), plus
  surfaces filtering.
- Parity invariant: every resolved sidebar entry with a grid surface and
  a non-tab route appears in the grid candidate pool.
- Regression: default grid (no custom layout) is identical before/after
  this change for both roles across flag combos (pin the exact key
  lists in the test).
- Route validity: every catalog `to` is added to the existing
  `KNOWN_ROUTES` pinning test (verified against App.tsx).
- Manual: sidebar visual spot-check desktop + drawer as tenant admin,
  student, and platform admin on demo; grid edit-mode More grouping at
  390px.

## 6. Out of scope

- Re-curating the default 8 tiles per role.
- Any change to tab-bar composition.
- DB/schema changes (none needed).

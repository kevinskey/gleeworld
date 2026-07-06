# Shared Nav Catalog + Home-Grid Sidebar Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One shared nav catalog powers the desktop sidebar, mobile drawer, and home-grid tile pool, giving the grid full sidebar parity (~15 newly pinnable destinations) with zero behavior change to default grids, saved layouts, or sidebar rendering.

**Architecture:** A pure data module (`navCatalog.ts`: entries + `resolveNav(ctx)` gate resolver) replaces the three hand-maintained copies. `DashboardShell`'s two inline arrays become groupings of resolved entries; `getAppTiles` builds its candidate pool from resolved grid-surface entries while `DEFAULT_GRID_ORDER` pins today's default primary. Edit-mode "More" groups tiles under catalog section labels.

**Tech Stack:** React 18 + TypeScript, TanStack Query v5, lucide-react, vitest. No DB changes.

**Spec:** `docs/superpowers/specs/2026-07-06-nav-catalog-parity-design.md`

## Global Constraints

- Existing grid keys/routes/labels are FROZEN: `music`(→`/dashboard/viewer`,"Music"), `tracks`(→`/dashboard/part-tracks`,"Tracks"), `studio`, `sight`(→`/dashboard/sight-reading`,"Sight Reading"), `attendance`(→`/attendance`), `academy`, `tickets`(→`/box-office`,"Tickets"), `planner`(→`/dashboard/concert-planner`,"Programs"), `finance`, `merch`(→`/store`,"Merch"). Saved layouts store these keys — never rename.
- Default grid (no custom layout) must be byte-identical to today for both roles across flag combos: primary = first 8 enabled of `DEFAULT_GRID_ORDER`.
- Sidebar + mobile drawer must render pixel-identically (same labels, icons, tones, tourIds, hero row, section order, gating).
- Sidebar keeps its per-key `useModuleAccess` data source; the grid keeps its `useTenantModules` source (as today). What's shared is the catalog and gate semantics, not the fetch layer.
- Tab bar (`getTabItems`, `MobileBottomNav`) is untouched.
- Light theme tokens, `text-xs`+ text, `w-4 h-4`+ icons, ≥44px targets, `motion-reduce:` opt-outs.
- Tests: `npm test` (vitest, node env — no component tests). Build: `npm run build` (no typecheck — esbuild).
- Repo: `/private/tmp/claude-501/-Users-kevinjohnson/28057dbd-6549-481b-87fa-738700c535f2/scratchpad/gleeworld`, branch `feat/nav-catalog-parity`.
- Commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: `navCatalog.ts` — catalog data + `resolveNav` (TDD)

**Files:**
- Create: `src/lib/navigation/navCatalog.ts`
- Test: `src/lib/navigation/__tests__/navCatalog.test.ts`
- Modify: `docs/superpowers/specs/2026-07-06-nav-catalog-parity-design.md` (add `gridIcon` to the CatalogEntry sketch — grid and sidebar historically use different icons for four shared destinations; the spec's `gridLabel` mechanism extends to icons)

**Interfaces:**
- Consumes: lucide-react icons only.
- Produces (Tasks 2–4 rely on these exact names):
  - `export type NavSectionKey = 'today'|'music'|'teach'|'make'|'plan'|'reach'|'money'|'people'|'admin'`
  - `export const NAV_SECTION_LABELS: Record<NavSectionKey, string>` (`today:'Today', music:'Music', teach:'Teach', make:'Make', plan:'Plan', reach:'Reach', money:'Money', people:'People', admin:'Admin'`)
  - `export interface NavGate { module?: string; moduleAny?: string[]; adminOnly?: boolean; platformAdminOnly?: boolean; librarianOnly?: boolean }`
  - `export interface CatalogEntry { key: string; to: string; label: string; gridLabel?: string; icon: LucideIcon; gridIcon?: LucideIcon; section: NavSectionKey; tone: string; tourId: string; hero?: boolean; end?: boolean; surfaces?: Array<'sidebar'|'grid'>; gate?: NavGate }`
  - `export const NAV_CATALOG: CatalogEntry[]`
  - `export interface NavContext { hasModule: (key: string) => boolean; isTenantAdmin: boolean; isPlatformAdmin: boolean; canLibrarian: boolean; hiddenRoutes: ReadonlySet<string> }`
  - `export function resolveNav(ctx: NavContext): CatalogEntry[]`
  - `export function entrySurfaces(e: CatalogEntry): Array<'sidebar'|'grid'>` (returns `e.surfaces ?? ['sidebar','grid']`)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/navigation/__tests__/navCatalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { NAV_CATALOG, resolveNav, entrySurfaces, type NavContext } from '../navCatalog';

const openCtx = (over: Partial<NavContext> = {}): NavContext => ({
  hasModule: () => true, isTenantAdmin: true, isPlatformAdmin: true,
  canLibrarian: true, hiddenRoutes: new Set(), ...over,
});

describe('NAV_CATALOG integrity', () => {
  it('keys are unique', () => {
    const keys = NAV_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('frozen grid keys keep their exact routes and grid labels', () => {
    const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
    const frozen: Array<[string, string, string]> = [
      ['music', '/dashboard/viewer', 'Music'],
      ['tracks', '/dashboard/part-tracks', 'Tracks'],
      ['studio', '/studio', 'Studio'],
      ['sight', '/dashboard/sight-reading', 'Sight Reading'],
      ['attendance', '/attendance', 'Attendance'],
      ['academy', '/dashboard/academy', 'Academy'],
      ['tickets', '/box-office', 'Tickets'],
      ['planner', '/dashboard/concert-planner', 'Programs'],
      ['finance', '/dashboard/finance', 'Finance'],
      ['merch', '/store', 'Merch'],
    ];
    for (const [key, to, gridLabel] of frozen) {
      const e = byKey.get(key);
      expect(e, key).toBeDefined();
      expect(e!.to).toBe(to);
      expect(e!.gridLabel ?? e!.label).toBe(gridLabel);
    }
  });
});

describe('resolveNav gates', () => {
  it('open context resolves every entry', () => {
    expect(resolveNav(openCtx()).length).toBe(NAV_CATALOG.length);
  });
  it('module gate drops entries whose module is off', () => {
    const out = resolveNav(openCtx({ hasModule: (k) => k !== 'pr_hub' }));
    expect(out.find((e) => e.key === 'pr-hub')).toBeUndefined();
    expect(out.find((e) => e.key === 'feeds')).toBeDefined();
  });
  it('moduleAny keeps Store when either merch or store is on', () => {
    const only = (on: string) => openCtx({ hasModule: (k) => k === on });
    expect(resolveNav(only('merch')).find((e) => e.key === 'shop')).toBeDefined();
    expect(resolveNav(only('store')).find((e) => e.key === 'shop')).toBeDefined();
    expect(resolveNav(openCtx({ hasModule: () => false })).find((e) => e.key === 'shop')).toBeUndefined();
  });
  it('adminOnly entries hidden from non-admins', () => {
    const out = resolveNav(openCtx({ isTenantAdmin: false }));
    for (const key of ['practice', 'fan-page', 'box-office', 'site-setup']) {
      expect(out.find((e) => e.key === key), key).toBeUndefined();
    }
  });
  it('platformAdminOnly hides Tenants from tenant admins', () => {
    expect(resolveNav(openCtx({ isPlatformAdmin: false })).find((e) => e.key === 'tenants')).toBeUndefined();
  });
  it('librarianOnly requires both module and permission', () => {
    expect(resolveNav(openCtx({ canLibrarian: false })).find((e) => e.key === 'librarian')).toBeUndefined();
    expect(resolveNav(openCtx({ hasModule: (k) => k !== 'librarian' })).find((e) => e.key === 'librarian')).toBeUndefined();
  });
  it('hiddenRoutes filters by route', () => {
    const out = resolveNav(openCtx({ hiddenRoutes: new Set(['/dashboard/pr-hub']) }));
    expect(out.find((e) => e.to === '/dashboard/pr-hub')).toBeUndefined();
  });
  it('flagless core (Music Library, People, Video) survives an all-off context', () => {
    const out = resolveNav({ hasModule: () => false, isTenantAdmin: false, isPlatformAdmin: false, canLibrarian: false, hiddenRoutes: new Set() });
    for (const key of ['music-library', 'people', 'video', 'music-tools', 'office-hours', 'analytics', 'settings', 'attendance', 'academy']) {
      expect(out.find((e) => e.key === key), key).toBeDefined();
    }
  });
});

describe('entrySurfaces', () => {
  it('attendance is grid-only; Command Center/Messenger/Calendar are sidebar-only', () => {
    const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
    expect(entrySurfaces(byKey.get('attendance')!)).toEqual(['grid']);
    for (const key of ['home', 'messages', 'calendar']) {
      expect(entrySurfaces(byKey.get(key)!)).toEqual(['sidebar']);
    }
    expect(entrySurfaces(byKey.get('pr-hub')!)).toEqual(['sidebar', 'grid']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/navigation/__tests__/navCatalog.test.ts`
Expected: FAIL — module `../navCatalog` not found.

- [ ] **Step 3: Implement the catalog**

Create `src/lib/navigation/navCatalog.ts`. The entry values are copied verbatim from `src/components/dashboard/DashboardShell.tsx` (Sidebar `sections`, ~lines 265–345 — routes, labels, icons, tones, tourIds, hero, gating conditions). `gridLabel`/`gridIcon` preserve the shipped grid tiles where they differ from the sidebar.

```ts
// Single source of truth for app navigation destinations. Consumed by:
//   - DashboardShell desktop sidebar + mobile drawer (grouped by section)
//   - the home grid tile pool (grid surfaces, minus tab-bar routes)
// Entry values are the former DashboardShell inline arrays, verbatim.
// `key` is stored in user_preferences.home_tile_layout — NEVER rename.
// gridLabel/gridIcon keep the shipped grid tiles (short word / original
// icon) where the sidebar historically differs.
// Spec: docs/superpowers/specs/2026-07-06-nav-catalog-parity-design.md
import {
  Home, MessageSquare, Calendar, Music, ScanEye, Eye, Mic, Images, LibraryBig,
  GraduationCap, CalendarClock, Disc3, Film, Wrench, ClipboardList, ListMusic,
  Church, Route as RouteIcon, ScanLine, Megaphone, Heart, Newspaper, Store,
  Shirt, Ticket, DollarSign, Wallet, Users, Settings, TrendingUp, Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type NavSectionKey =
  'today' | 'music' | 'teach' | 'make' | 'plan' | 'reach' | 'money' | 'people' | 'admin';

export const NAV_SECTION_LABELS: Record<NavSectionKey, string> = {
  today: 'Today', music: 'Music', teach: 'Teach', make: 'Make', plan: 'Plan',
  reach: 'Reach', money: 'Money', people: 'People', admin: 'Admin',
};

export interface NavGate {
  module?: string;
  moduleAny?: string[];
  adminOnly?: boolean;
  platformAdminOnly?: boolean;
  librarianOnly?: boolean;
}

export interface CatalogEntry {
  key: string;
  to: string;
  label: string;
  gridLabel?: string;
  icon: LucideIcon;
  gridIcon?: LucideIcon;
  section: NavSectionKey;
  tone: string;
  tourId: string;
  hero?: boolean;
  end?: boolean;
  surfaces?: Array<'sidebar' | 'grid'>;
  gate?: NavGate;
}

export const NAV_CATALOG: CatalogEntry[] = [
  // Today — tab-bar territory; sidebar-only, never grid tiles.
  { key: 'home',     to: '/dashboard',           label: 'Command Center', icon: Home,          section: 'today', tone: 'bg-primary/10 text-primary', tourId: 'nav-command-center', end: true, surfaces: ['sidebar'] },
  { key: 'messages', to: '/dashboard/messenger', label: 'Messenger',      icon: MessageSquare, section: 'today', tone: 'bg-cyan-50 text-cyan-600',   tourId: 'nav-messenger',      surfaces: ['sidebar'] },
  { key: 'calendar', to: '/dashboard/calendar',  label: 'Calendar',       icon: Calendar,      section: 'today', tone: 'bg-purple-50 text-purple-600', tourId: 'nav-calendar',     surfaces: ['sidebar'] },
  // Music
  { key: 'music-library', to: '/dashboard/music-library', label: 'Music Library', icon: Music,    section: 'music', tone: 'bg-rose-50 text-rose-600',     tourId: 'nav-music-library' },
  { key: 'music',         to: '/dashboard/viewer',        label: 'Viewer',        icon: ScanEye,  section: 'music', tone: 'bg-amber-50 text-amber-700',   tourId: 'nav-viewer',        gridLabel: 'Music', gridIcon: Music, gate: { module: 'viewer' } },
  { key: 'sight',         to: '/dashboard/sight-reading', label: 'Sight Reading', icon: Eye,      section: 'music', tone: 'bg-violet-50 text-violet-600', tourId: 'nav-sight-reading', gridIcon: ScanEye, gate: { module: 'sight_reading' } },
  { key: 'tracks',        to: '/dashboard/part-tracks',   label: 'Part Tracks',   icon: Mic,      section: 'music', tone: 'bg-indigo-50 text-indigo-600', tourId: 'nav-part-tracks',   gridLabel: 'Tracks', gate: { module: 'part_tracks' } },
  { key: 'media-library', to: '/dashboard/media-library', label: 'Media Library', icon: Images,   section: 'music', tone: 'bg-orange-50 text-orange-600', tourId: 'nav-media-library' },
  { key: 'librarian',     to: '/dashboard/librarian',     label: 'Librarian',     icon: LibraryBig, section: 'music', tone: 'bg-slate-50 text-slate-600', tourId: 'nav-librarian',    gate: { module: 'librarian', librarianOnly: true } },
  // Teach
  { key: 'academy',      to: '/dashboard/academy',             label: 'Academy',      icon: GraduationCap, section: 'teach', tone: 'bg-primary text-primary-foreground', tourId: 'nav-academy', hero: true },
  { key: 'office-hours', to: '/dashboard/office-hours',        label: 'Office Hours', icon: CalendarClock, section: 'teach', tone: 'bg-emerald-50 text-emerald-600',     tourId: 'nav-office-hours' },
  { key: 'practice',     to: '/dashboard/practice-recordings', label: 'Practice',     icon: Mic,           section: 'teach', tone: 'bg-teal-50 text-teal-700',           tourId: 'nav-practice', gate: { adminOnly: true } },
  // Make
  { key: 'studio',      to: '/studio',                label: 'Studio',      icon: Disc3,  section: 'make', tone: 'bg-sky-50 text-sky-600',   tourId: 'nav-studio', gate: { module: 'studio' } },
  { key: 'video',       to: '/video',                 label: 'Video',       icon: Film,   section: 'make', tone: 'bg-pink-50 text-pink-600', tourId: 'nav-video' },
  { key: 'music-tools', to: '/dashboard/music-tools', label: 'Music Tools', icon: Wrench, section: 'make', tone: 'bg-cyan-50 text-cyan-600', tourId: 'nav-music-tools' },
  // Plan
  { key: 'planner',   to: '/dashboard/concert-planner', label: 'Concert Planner', icon: ClipboardList, section: 'plan', tone: 'bg-emerald-50 text-emerald-700', tourId: 'nav-concert-planner', gridLabel: 'Programs', gridIcon: ListMusic, gate: { module: 'concert_planner' } },
  { key: 'liturgy',   to: '/dashboard/liturgy',         label: 'Liturgy Planner', icon: Church,        section: 'plan', tone: 'bg-amber-50 text-amber-700',     tourId: 'nav-liturgy-planner', gate: { module: 'liturgy_planner' } },
  { key: 'tour',      to: '/tour-manager',              label: 'Tour Manager',    icon: RouteIcon,     section: 'plan', tone: 'bg-blue-50 text-blue-600',       tourId: 'nav-tour-manager', gate: { module: 'tour' } },
  { key: 'auditions', to: '/dashboard/auditions',       label: 'Auditions',       icon: ScanLine,      section: 'plan', tone: 'bg-lime-50 text-lime-600',       tourId: 'nav-auditions', gate: { module: 'auditions' } },
  // Reach
  { key: 'pr-hub',    to: '/dashboard/pr-hub', label: 'PR Hub',    icon: Megaphone,     section: 'reach', tone: 'bg-fuchsia-50 text-fuchsia-600', tourId: 'nav-pr-hub', gate: { module: 'pr_hub' } },
  { key: 'fan-page',  to: '/admin/fan-page',   label: 'Fan Page',  icon: Heart,         section: 'reach', tone: 'bg-rose-50 text-rose-700',       tourId: 'nav-fan-page', gate: { adminOnly: true } },
  { key: 'feeds',     to: '/dashboard/feeds',  label: 'Feeds',     icon: Newspaper,     section: 'reach', tone: 'bg-blue-50 text-blue-600',       tourId: 'nav-feeds', gate: { module: 'feeds' } },
  { key: 'shop',      to: '/dashboard/shop',   label: 'Store',     icon: Store,         section: 'reach', tone: 'bg-amber-50 text-amber-600',     tourId: 'nav-shop', gate: { moduleAny: ['merch', 'store'] } },
  { key: 'graduates', to: '/dashboard/alumni', label: 'Graduates', icon: GraduationCap, section: 'reach', tone: 'bg-teal-50 text-teal-600',       tourId: 'nav-alumni', gate: { module: 'alumni' } },
  { key: 'merch',     to: '/store',            label: 'Merch',     icon: Shirt,         section: 'reach', tone: 'bg-amber-50 text-amber-600',     tourId: 'nav-merch-grid', surfaces: ['grid'], gate: { module: 'merch' } },
  // Money
  { key: 'box-office', to: '/dashboard/box-office', label: 'Box Office', icon: Ticket,     section: 'money', tone: 'bg-rose-50 text-rose-700',       tourId: 'nav-box-office', gate: { module: 'box_office', adminOnly: true } },
  { key: 'finance',    to: '/dashboard/finance',    label: 'Finance',    icon: DollarSign, section: 'money', tone: 'bg-emerald-50 text-emerald-600', tourId: 'nav-finance', gridIcon: Wallet, gate: { module: 'finance' } },
  { key: 'tickets',    to: '/box-office',           label: 'Tickets',    icon: Ticket,     section: 'money', tone: 'bg-rose-50 text-rose-700',       tourId: 'nav-tickets-grid', surfaces: ['grid'], gate: { module: 'box_office' } },
  // People
  { key: 'people',     to: '/dashboard/users', label: 'People',     icon: Users,         section: 'people', tone: 'bg-cyan-50 text-cyan-600', tourId: 'nav-people' },
  { key: 'attendance', to: '/attendance',      label: 'Attendance', icon: ClipboardList, section: 'people', tone: 'bg-cyan-50 text-cyan-600', tourId: 'nav-attendance-grid', surfaces: ['grid'] },
  // Admin
  { key: 'site-setup', to: '/admin/public-page',   label: 'Site Setup', icon: Settings,   section: 'admin', tone: 'bg-fuchsia-50 text-fuchsia-700', tourId: 'nav-site-setup', gate: { adminOnly: true } },
  { key: 'analytics',  to: '/dashboard/analytics', label: 'Analytics',  icon: TrendingUp, section: 'admin', tone: 'bg-purple-50 text-purple-600',   tourId: 'nav-analytics' },
  { key: 'settings',   to: '/dashboard/workspace', label: 'Settings',   icon: Settings,   section: 'admin', tone: 'bg-muted text-muted-foreground', tourId: 'nav-settings' },
  { key: 'tenants',    to: '/admin/tenants',       label: 'Tenants',    icon: Sparkles,   section: 'admin', tone: 'bg-indigo-50 text-indigo-700',   tourId: 'nav-platform-tenants', surfaces: ['sidebar'], gate: { platformAdminOnly: true } },
];

export interface NavContext {
  hasModule: (key: string) => boolean;
  isTenantAdmin: boolean;
  isPlatformAdmin: boolean;
  canLibrarian: boolean;
  hiddenRoutes: ReadonlySet<string>;
}

export function entrySurfaces(e: CatalogEntry): Array<'sidebar' | 'grid'> {
  return e.surfaces ?? ['sidebar', 'grid'];
}

function gateOpen(gate: NavGate | undefined, ctx: NavContext): boolean {
  if (!gate) return true;
  if (gate.module && !ctx.hasModule(gate.module)) return false;
  if (gate.moduleAny && !gate.moduleAny.some((m) => ctx.hasModule(m))) return false;
  if (gate.adminOnly && !ctx.isTenantAdmin) return false;
  if (gate.platformAdminOnly && !ctx.isPlatformAdmin) return false;
  if (gate.librarianOnly && !ctx.canLibrarian) return false;
  return true;
}

// Total: missing/false ctx fields can only under-show, never leak a
// gated destination.
export function resolveNav(ctx: NavContext): CatalogEntry[] {
  return NAV_CATALOG.filter((e) => gateOpen(e.gate, ctx) && !ctx.hiddenRoutes.has(e.to));
}
```

- [ ] **Step 4: Amend the spec's CatalogEntry sketch**

In `docs/superpowers/specs/2026-07-06-nav-catalog-parity-design.md`, after the `gridLabel?: string;` line in the interface block, add:

```ts
  gridIcon?: LucideIcon;    // grid keeps its shipped icon where the sidebar differs
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/lib/navigation/__tests__/navCatalog.test.ts`
Expected: PASS (all describe blocks). Then `npm test` — full suite green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/navigation/navCatalog.ts src/lib/navigation/__tests__/navCatalog.test.ts docs/superpowers/specs/2026-07-06-nav-catalog-parity-design.md
git commit -m "feat(nav): shared NAV_CATALOG + resolveNav gate resolver"
```

---

### Task 2: Grid pool from the catalog (TDD)

**Files:**
- Modify: `src/lib/navigation/moduleFlags.ts` (add `toModuleSet`)
- Modify: `src/lib/navigation/appDestinations.ts` (`getAppTiles` candidates from catalog; `Destination` gains `section`)
- Test: `src/lib/navigation/__tests__/appDestinations.test.ts`

**Interfaces:**
- Consumes: `NAV_CATALOG`, `resolveNav`, `entrySurfaces`, `NavContext`, `NavSectionKey` from `./navCatalog` (Task 1); existing `getTabItems`, `ModuleFlags`, `TileLayout`.
- Produces (Tasks 3–4 rely on):
  - `export function toModuleSet(modules: TenantModule[]): Set<string>` in `moduleFlags.ts` — set of active `module_id`s.
  - `Destination` gains `section?: NavSectionKey`.
  - `getAppTiles(role: 'student'|'faculty', flags: ModuleFlags, nav: NavContext, layout?: TileLayout | null): { primary: Destination[]; overflow: Destination[] }` — NOTE the new required third param; `flags` is still used for tab-bar dedupe via `getTabItems`.
  - `export const DEFAULT_GRID_ORDER = ['music','tracks','studio','sight','attendance','academy','tickets','planner','finance','merch']`

- [ ] **Step 1: Write the failing tests**

In `src/lib/navigation/__tests__/appDestinations.test.ts`, update imports and add a nav-context helper near the existing `allOn`/`allOff` fixtures:

```ts
import { getTabItems, getAppTiles, parseTileLayout, DEFAULT_GRID_ORDER, type ModuleFlags, type TileLayout } from '../appDestinations';
import type { NavContext } from '../navCatalog';

// Mirrors toModuleFlags's key set so flags and nav agree in tests.
const FLAG_MODULE: Record<keyof ModuleFlags, string> = {
  hasViewer: 'viewer', hasPartTracks: 'part_tracks', hasStudio: 'studio',
  hasSightReading: 'sight_reading', hasBoxOffice: 'box_office',
  hasConcertPlanner: 'concert_planner', hasMerch: 'merch', hasStore: 'store',
  hasFinance: 'finance', hasAcademy: 'academy',
};
const navFor = (flags: ModuleFlags, over: Partial<NavContext> = {}): NavContext => ({
  hasModule: (k) => Object.entries(FLAG_MODULE).some(([f, m]) => m === k && flags[f as keyof ModuleFlags]),
  isTenantAdmin: false, isPlatformAdmin: false, canLibrarian: false,
  hiddenRoutes: new Set(), ...over,
});
```

Update EVERY existing `getAppTiles(role, flags)` call in this file to `getAppTiles(role, flags, navFor(flags))` and every `getAppTiles(role, flags, layout)` to `getAppTiles(role, flags, navFor(flags), layout)`. Then append:

```ts
describe('getAppTiles catalog parity', () => {
  it('default primary is byte-identical to the pre-catalog grid for both roles (allOn)', () => {
    // Faculty tabs claim /dashboard/viewer (Music); student tabs claim
    // /dashboard/viewer AND /studio — so those keys dedupe out of the grid,
    // exactly as before this change.
    expect(getAppTiles('faculty', allOn, navFor(allOn)).primary.map((t) => t.key))
      .toEqual(['tracks', 'studio', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance']);
    expect(getAppTiles('student', allOn, navFor(allOn)).primary.map((t) => t.key))
      .toEqual(['tracks', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance', 'merch']);
  });
  it('DEFAULT_GRID_ORDER is the frozen 10-key list', () => {
    expect(DEFAULT_GRID_ORDER).toEqual(['music', 'tracks', 'studio', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance', 'merch']);
  });
  it('sidebar-parity destinations land in overflow, never default primary', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn, { isTenantAdmin: true }));
    const overflowKeys = overflow.map((t) => t.key);
    for (const key of ['music-library', 'media-library', 'office-hours', 'video', 'music-tools', 'people', 'analytics', 'settings', 'shop', 'box-office', 'practice', 'fan-page', 'site-setup']) {
      expect(overflowKeys, key).toContain(key);
      expect(primary.map((t) => t.key)).not.toContain(key);
    }
  });
  it('parity invariant: every resolved grid-surface non-tab entry is a candidate', async () => {
    const { resolveNav, entrySurfaces } = await import('../navCatalog');
    const nav = navFor(allOn, { isTenantAdmin: true, isPlatformAdmin: true, canLibrarian: true });
    const tabRoutes = new Set(getTabItems('faculty', allOn).map((t) => t.to));
    const expected = resolveNav(nav)
      .filter((e) => entrySurfaces(e).includes('grid') && !tabRoutes.has(e.to))
      .map((e) => e.key).sort();
    const { primary, overflow } = getAppTiles('faculty', allOn, nav);
    expect([...primary, ...overflow].map((t) => t.key).sort()).toEqual(expected);
  });
  it('admin-gated tiles absent for non-admins', () => {
    const { primary, overflow } = getAppTiles('student', allOn, navFor(allOn));
    const keys = [...primary, ...overflow].map((t) => t.key);
    for (const key of ['box-office', 'practice', 'fan-page', 'site-setup']) expect(keys, key).not.toContain(key);
  });
  it('hidden-nav routes are not pinnable', () => {
    const nav = navFor(allOn, { hiddenRoutes: new Set(['/dashboard/music-tools']) });
    const keys = [...getAppTiles('student', allOn, nav).primary, ...getAppTiles('student', allOn, nav).overflow].map((t) => t.key);
    expect(keys).not.toContain('music-tools');
  });
  it('custom layouts can pin parity destinations', () => {
    const layout: TileLayout = { v: 1, order: ['people', 'music-library', 'tickets'] };
    const { primary } = getAppTiles('faculty', allOn, navFor(allOn), layout);
    expect(primary.map((t) => t.key)).toEqual(['people', 'music-library', 'tickets']);
  });
  it('grid tiles carry their catalog section and grid label/icon overrides', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn));
    const planner = [...primary, ...overflow].find((t) => t.key === 'planner');
    expect(planner?.label).toBe('Programs');
    expect(planner?.section).toBe('plan');
  });
});
```

Also update the existing `KNOWN_ROUTES` set in this file with the new grid-candidate routes (verify each against `<Route path=...>` in `src/App.tsx` first; if one is missing from App.tsx, STOP and report DONE_WITH_CONCERNS naming it rather than adding a dead tile):

```ts
'/dashboard/music-library', '/dashboard/media-library', '/dashboard/librarian',
'/dashboard/office-hours', '/dashboard/practice-recordings', '/video',
'/dashboard/music-tools', '/dashboard/liturgy', '/tour-manager',
'/dashboard/auditions', '/dashboard/pr-hub', '/admin/fan-page',
'/dashboard/feeds', '/dashboard/shop', '/dashboard/alumni',
'/dashboard/box-office', '/dashboard/users', '/admin/public-page',
'/dashboard/analytics', '/dashboard/workspace',
```

And extend the route-validity test to run with the admin-open nav context so the new tiles are exercised.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/navigation`
Expected: FAIL — `DEFAULT_GRID_ORDER` not exported; `getAppTiles` arity/behavior mismatches.

- [ ] **Step 3: Implement**

In `src/lib/navigation/moduleFlags.ts` append:

```ts
// Set-of-active-module-ids view of the same rows, for NavContext.hasModule.
export function toModuleSet(modules: TenantModule[]): Set<string> {
  const set = new Set(modules.map((m) => m.module_id));
  set.add('academy'); // Academy is core, mirrored from toModuleFlags.
  return set;
}
```

In `src/lib/navigation/appDestinations.ts`:

1. Import the catalog: `import { resolveNav, entrySurfaces, type NavContext, type NavSectionKey } from './navCatalog';`
2. Extend `Destination`: `export interface Destination { key: string; to: string; label: string; icon: LucideIcon; section?: NavSectionKey; }`
3. Export the frozen order: `export const DEFAULT_GRID_ORDER = ['music', 'tracks', 'studio', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance', 'merch'];`
4. Replace `getAppTiles`'s hard-coded `candidates` array with catalog resolution (tab dedupe and layout reconciliation unchanged):

```ts
export function getAppTiles(role: 'student' | 'faculty', flags: ModuleFlags, nav: NavContext, layout?: TileLayout | null):
  { primary: Destination[]; overflow: Destination[] } {
  const tabRoutes = new Set(getTabItems(role, flags).map((t) => t.to));
  // Candidate pool = every resolved catalog entry with a grid surface whose
  // route the tab bar hasn't claimed. Catalog order groups by section, which
  // the grouped "More" UI relies on.
  const enabled: Destination[] = resolveNav(nav)
    .filter((e) => entrySurfaces(e).includes('grid') && !tabRoutes.has(e.to))
    .map((e) => ({ key: e.key, to: e.to, label: e.gridLabel ?? e.label, icon: e.gridIcon ?? e.icon, section: e.section }));

  if (!layout) {
    // Default grid frozen: first 8 enabled keys of DEFAULT_GRID_ORDER in
    // that order; EVERYTHING else (including all sidebar-parity additions)
    // goes to overflow, in catalog order.
    const byKey = new Map(enabled.map((d) => [d.key, d]));
    const primary = DEFAULT_GRID_ORDER
      .map((k) => byKey.get(k))
      .filter((d): d is Destination => d !== undefined)
      .slice(0, 8);
    const pinned = new Set(primary.map((d) => d.key));
    return { primary, overflow: enabled.filter((d) => !pinned.has(d.key)) };
  }

  const byKey = new Map(enabled.map((d) => [d.key, d]));
  const primary = layout.order
    .map((k) => byKey.get(k))
    .filter((d): d is Destination => d !== undefined);
  const pinned = new Set(primary.map((d) => d.key));
  return { primary, overflow: enabled.filter((d) => !pinned.has(d.key)) };
}
```

The old `candidates` array and its `D` references inside `getAppTiles` are deleted; the `D` map and `getTabItems` stay untouched for the tab bar.

5. Update `src/pages/dashboard/HouseHome.tsx` minimally so the build keeps compiling in this task (full ctx wiring is Task 4): add imports and a temporary most-restrictive ctx —

```tsx
import { toModuleFlags, toModuleSet } from '@/lib/navigation/moduleFlags';
import type { NavContext } from '@/lib/navigation/navCatalog';
```
```tsx
  const nav: NavContext = {
    hasModule: (k) => toModuleSet(modules).has(k),
    isTenantAdmin: false, isPlatformAdmin: false, canLibrarian: false,
    hiddenRoutes: new Set(),
  };
  const { primary, overflow } = modulesLoading || layoutLoading
    ? { primary: [], overflow: [] }
    : getAppTiles(isFaculty ? 'faculty' : 'student', flags, nav, layout);
```

(Keep the existing `modulesLoading`/`layoutLoading` guard structure; only the call changes.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test && npm run build`
Expected: full suite PASS (existing + new), build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/navigation/moduleFlags.ts src/lib/navigation/appDestinations.ts src/lib/navigation/__tests__/appDestinations.test.ts src/pages/dashboard/HouseHome.tsx
git commit -m "feat(home): grid tile pool resolves from the shared nav catalog"
```

---

### Task 3: DashboardShell consumes the catalog (pixel-identical)

**Files:**
- Modify: `src/components/dashboard/DashboardShell.tsx` — the `Sidebar()` sections array (~lines 265–345) and the `MobileNav()` sections array (~lines 515–600), plus their now-unused per-module `useModuleAccess` calls and icon imports.

**Interfaces:**
- Consumes: `NAV_CATALOG`, `resolveNav`, `entrySurfaces`, `NAV_SECTION_LABELS`, `NavContext`, `CatalogEntry`, `NavSectionKey` (Task 1).
- Produces: nothing new — both surfaces must render exactly as before.

- [ ] **Step 1: Build a shared ctx + grouping helper inside DashboardShell**

Add near the top of the file (module scope, below imports):

```tsx
import { NAV_CATALOG, resolveNav, entrySurfaces, NAV_SECTION_LABELS, type CatalogEntry, type NavContext, type NavSectionKey } from '@/lib/navigation/navCatalog';

const SECTION_ORDER: NavSectionKey[] = ['today', 'music', 'teach', 'make', 'plan', 'reach', 'money', 'people', 'admin'];

// Groups resolved sidebar-surface entries into the render shape both nav
// columns use. Sections with zero visible entries drop out (unchanged
// behavior). label:'Today' historically rendered with its section label
// like every other section.
function buildNavSections(ctx: NavContext): Array<{ label: string; items: CatalogEntry[] }> {
  const resolved = resolveNav(ctx).filter((e) => entrySurfaces(e).includes('sidebar'));
  return SECTION_ORDER
    .map((s) => ({ label: NAV_SECTION_LABELS[s], items: resolved.filter((e) => e.section === s) }))
    .filter((s) => s.items.length > 0);
}
```

- [ ] **Step 2: Rewire `Sidebar()`**

Replace the 17 individual `const { hasAccess: hasX } = useModuleAccess('x')` lines with a single map (module keys: `sight_reading, box_office, part_tracks, auditions, librarian, pr_hub, alumni, finance, merch, store, feeds, viewer, concert_planner, tour, liturgy_planner, studio`):

```tsx
  const MODULE_KEYS = ['sight_reading', 'box_office', 'part_tracks', 'auditions', 'librarian', 'pr_hub', 'alumni', 'finance', 'merch', 'store', 'feeds', 'viewer', 'concert_planner', 'tour', 'liturgy_planner', 'studio'] as const;
  // Hooks must run unconditionally and in stable order — a fixed key list keeps that true.
  const moduleAccess: Record<string, boolean> = {};
  for (const key of MODULE_KEYS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed-length loop over a const array; call order is stable across renders
    moduleAccess[key] = useModuleAccess(key).hasAccess;
  }
```

(If the repo's eslint config hard-errors on that pattern even with the disable, fall back to keeping the 16 explicit `useModuleAccess` lines and assembling `moduleAccess` from them — the ctx below is what matters.)

Then replace the entire inline `sections` array with:

```tsx
  const navCtx: NavContext = {
    hasModule: (k) => k === 'academy' || !!moduleAccess[k],
    isTenantAdmin, isPlatformAdmin, canLibrarian: userCanLibrarian,
    hiddenRoutes: hiddenNav,
  };
  const sections = buildNavSections(navCtx);
```

The render loop below it consumes `{ label, items }` where each item has `to/label/icon/tone/tourId/hero/end` — same fields as before (the old local `NavItem` type is replaced by `CatalogEntry`; `tourId` and `tone` names match). Keep the render JSX untouched except the type annotation. Note the old code applied `hiddenNav` via `.filter((it) => !hiddenNav.has(it.to))` after building sections — `resolveNav` now does that; delete the trailing `.map(...filter...)`.

- [ ] **Step 3: Rewire `MobileNav()` identically**

Same replacement in `MobileNav()`: delete its 17 `useModuleAccess` lines and inline sections array; build the same `navCtx` (it computes its own `isTenantAdmin`/`isPlatformAdmin`/`userCanLibrarian` locally — keep those lines) and call `buildNavSections(navCtx)`. Its item type also becomes `CatalogEntry` (it never used `tourId`; that's fine — extra fields are ignored).

- [ ] **Step 4: Delete dead code**

Remove now-unused icon imports from DashboardShell (only those no longer referenced anywhere in the file — check each with a search before deleting; e.g. `Church`, `RouteIcon`, `ScanLine`, `Megaphone`, `Newspaper`, `LibraryBig`, `Images`, `CalendarClock`, `TrendingUp`, `Disc3`, `Film`, `Wrench`, `Ticket`, `DollarSign`, `Heart`, `Sparkles`, `ScanEye`, `Eye`, `Store` are candidates — some are used elsewhere in the topbar/menus, verify each). Remove the unused `NavItem`/`NavSection` local types.

- [ ] **Step 5: Verify**

Run: `npm test && npm run build && npx eslint src/components/dashboard/DashboardShell.tsx`
Expected: suite PASS, build succeeds, eslint no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardShell.tsx
git commit -m "refactor(nav): sidebar + mobile drawer render from the shared catalog"
```

---

### Task 4: HouseHome real NavContext + grouped More in edit mode

**Files:**
- Modify: `src/pages/dashboard/HouseHome.tsx` (replace Task 2's placeholder ctx)
- Modify: `src/components/dashboard/HomeTileGrid.tsx` (grouped edit-mode More)

**Interfaces:**
- Consumes: `toModuleSet` (Task 2), `useUserRole().canEditMusicLibrary`, `useTenantNavPrefs` from `@/hooks/useTenantNavPrefs`, `NAV_SECTION_LABELS` + `NavSectionKey` (Task 1), `Destination.section` (Task 2).
- Produces: final user-facing behavior.

- [ ] **Step 1: Real ctx in HouseHome**

Replace Task 2's placeholder `nav` object. `useUserRole` is already imported; it also returns `canEditMusicLibrary`. Add `useTenantNavPrefs`:

```tsx
import { useTenantNavPrefs } from '@/hooks/useTenantNavPrefs';
```

```tsx
  const { profile, canEditMusicLibrary } = useUserRole();
  // (keep existing isFaculty/firstName lines; this extends the same destructure)
  const tenantSlug = (typeof window !== 'undefined' && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || null;
  const hiddenNav = useTenantNavPrefs();
  const moduleSet = useMemo(() => toModuleSet(modules), [modules]);
  const nav: NavContext = useMemo(() => ({
    hasModule: (k) => moduleSet.has(k),
    isTenantAdmin: !!profile?.is_admin || !!profile?.is_super_admin,
    isPlatformAdmin: !!profile?.is_super_admin && tenantSlug === 'main',
    canLibrarian: typeof canEditMusicLibrary === 'function'
      ? canEditMusicLibrary()
      : !!(profile?.is_admin || profile?.is_super_admin),
    hiddenRoutes: hiddenNav,
  }), [moduleSet, profile, tenantSlug, canEditMusicLibrary, hiddenNav]);
```

(These derivations mirror DashboardShell's exactly — same admin/platform/librarian rules.)

- [ ] **Step 2: Grouped More in HomeTileGrid edit mode**

In `src/components/dashboard/HomeTileGrid.tsx`, import the section labels:

```tsx
import { NAV_SECTION_LABELS, type NavSectionKey } from '@/lib/navigation/navCatalog';
```

Replace the edit-mode More block (currently: one `More` heading + a single flat grid of `draftOverflow` tiles) with section-grouped rendering. `draftOverflow` preserves catalog order, so grouping is a stable partition:

```tsx
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-4 mb-2">More</div>
          {draftOverflow.length === 0 ? (
            <p className="text-sm text-muted-foreground">Everything is on your grid.</p>
          ) : (
            (['music', 'teach', 'make', 'plan', 'reach', 'money', 'people', 'admin'] as NavSectionKey[])
              .map((s) => ({ s, tiles: draftOverflow.filter((t) => t.section === s) }))
              .filter(({ tiles }) => tiles.length > 0)
              .map(({ s, tiles }) => (
                <div key={s}>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground/70 mt-3 mb-2">
                    {NAV_SECTION_LABELS[s]}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {tiles.map((t, i) => (
                      <div key={t.key} className="relative">
                        <button type="button"
                          onClick={() => setDraft((d) => (d && !d.includes(t.key) ? [...d, t.key] : d))}
                          aria-label={`Add ${t.label} to grid`}
                          className="w-full flex flex-col items-center gap-1 text-xs text-muted-foreground min-h-[44px] animate-jiggle motion-reduce:animate-none"
                          style={{ animationDelay: `${(i % 4) * 75}ms` }}>
                          <KeycapFace tile={t} editing />
                        </button>
                        <span aria-hidden="true"
                          className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-background border border-border flex items-center justify-center pointer-events-none">
                          <Plus className="w-4 h-4 text-primary" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
```

Tiles without a `section` (none today — all grid candidates come from the catalog) would simply not render in a group; add a trailing catch-all group only if the filter set misses tiles: after the mapped groups, render any `draftOverflow.filter((t) => !t.section)` in one ungrouped grid with no heading (same tile markup). The view-mode More expander stays flat and unchanged.

- [ ] **Step 3: Verify**

Run: `npm test && npm run build && npx eslint src/pages/dashboard/HouseHome.tsx src/components/dashboard/HomeTileGrid.tsx`
Expected: suite PASS, build succeeds, no new eslint errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/HouseHome.tsx src/components/dashboard/HomeTileGrid.tsx
git commit -m "feat(home): real nav context + section-grouped More in edit mode"
```

---

### Task 5: Verification, final review, PR + merge

**Files:** none (verification + branch finish).

- [ ] **Step 1: Full suite + build**

Run: `npm test && npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 2: Browser verification (local preview, write-free)**

Rebuild with prod env and run the preview per the repo verify skill (`VITE_SUPABASE_URL=https://supabase.gleeworld.org VITE_SUPABASE_PUBLISHABLE_KEY=<anon key> npm run build; npm run preview -- --port 4199 --strictPort`). Re-run the existing 22-check harness (`scratchpad/verify-jiggle.mjs` — network-mocks all user_preferences writes) and additionally verify, logged in as `demo@gleeworld.org`:

1. Edit mode: More now lists the parity destinations grouped under Music/Teach/Make/… headings (student sees no Box Office/Practice/Fan Page/Site Setup; the demo super-admin account sees them).
2. Pin a parity tile (e.g. People) → it renders and navigates in view mode after Done (mocked save).
3. Desktop viewport (1280px): sidebar sections, labels, icons, tones, hero Academy row, and collapse behavior look identical to production; mobile drawer likewise at 390px.
4. No horizontal overflow at 390px.

- [ ] **Step 3: Final whole-branch review, then finish**

Dispatch the final code review per superpowers:requesting-code-review (range: branch base → HEAD). Fix findings, re-review. Then superpowers:finishing-a-development-branch — push, PR to main (repo PR flow), merge.

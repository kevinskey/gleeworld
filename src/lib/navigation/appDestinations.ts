// Single source of truth for phone navigation surfaces (tab bar + app
// grid). Tabs = daily verbs; grid = everything else the tenant enabled.
// Spec: docs/superpowers/specs/2026-07-04-house-and-stage-design.md §5.1–5.2
import {
  Home, MessageSquare, Music, Disc3, Calendar, Users, ScanEye, Mic,
  GraduationCap, Ticket, ClipboardList, ListMusic, Wallet,
  type LucideIcon,
} from 'lucide-react';
import { resolveNav, entrySurfaces, type NavContext, type NavSectionKey } from './navCatalog';
import { resolveKey, resolveKeys } from './mergedKeys';
// TYPE-only, deliberately: myTools.ts imports parseTileLayout from this
// module, so a value import here would close the runtime cycle mergedKeys.ts
// exists to avoid (see its header). `import type` is erased at compile time.
import type { ToolGroup } from './myTools';

export interface ModuleFlags {
  hasViewer: boolean; hasStudio: boolean;
  hasSightReading: boolean; hasBoxOffice: boolean; hasConcertPlanner: boolean;
  hasMerch: boolean; hasFinance: boolean; hasAcademy: boolean; hasStore: boolean;
  hasSongwriting: boolean; hasPlanner: boolean;
}

export interface Destination { key: string; to: string; label: string; icon: LucideIcon; section?: NavSectionKey; tone?: string; }

const D = {
  home:     { key: 'home',     to: '/dashboard',            label: 'Home',     icon: Home } as Destination,
  messages: { key: 'messages', to: '/dashboard/messenger',  label: 'Messages', icon: MessageSquare } as Destination,
  music:    { key: 'music',    to: '/dashboard/viewer',     label: 'Music',    icon: Music } as Destination,
  studio:   { key: 'studio',   to: '/studio',               label: 'Studio',   icon: Disc3 } as Destination,
  schedule: { key: 'schedule', to: '/dashboard/calendar',   label: 'Calendar', icon: Calendar } as Destination,
  roster:   { key: 'roster',   to: '/dashboard/people',     label: 'Roster',   icon: Users } as Destination,
  sight:    { key: 'sight',    to: '/dashboard/reading-music', label: 'Reading Music', icon: ScanEye } as Destination,
  academy:  { key: 'academy',  to: '/dashboard/academy',    label: 'Academy',  icon: GraduationCap } as Destination,
  tickets:  { key: 'tickets',  to: '/box-office',           label: 'Tickets',  icon: Ticket } as Destination,
  planner:  { key: 'planner',  to: '/dashboard/concert-planner', label: 'Programs', icon: ListMusic } as Destination,
  attendance: { key: 'attendance', to: '/attendance',       label: 'Attendance', icon: ClipboardList } as Destination,
  finance:  { key: 'finance',  to: '/dashboard/finance',    label: 'Finance',  icon: Wallet } as Destination,
  // 'merch' removed 2026-08-09 — it merged into 'shop' (see mergedKeys.ts)
  // and was never referenced from STUDENT_TAB_ORDER/FACULTY_TAB_ORDER below,
  // so this fixed dict never needed a 'shop' replacement entry for it.
};

// Module flag gating a given destination key, when the destination is
// module-gated. Destinations absent from this map (e.g. attendance, roster)
// are always available ("flagless-core") and never skipped for being "off".
const SLOT_FLAG: Partial<Record<string, keyof ModuleFlags>> = {
  music: 'hasViewer', studio: 'hasStudio',
  sight: 'hasSightReading', academy: 'hasAcademy',
};

// getTabItems always returns 3-5 DISTINCT, live tabs: Home and Messages
// first, Schedule last, with up to TAB_EXTRA_SLOTS slots in between filled
// from a role preference order. A slot candidate is skipped (never
// substituted) when its module flag is off, its key is already used, or its
// route is already used — so the result never contains a duplicate or a
// flag-off destination. If fewer than TAB_EXTRA_SLOTS candidates qualify,
// the result simply has fewer tabs (down to the 3-tab flagless-core floor).
const TAB_MAX = 5;
const CORE_TAB_COUNT = 3; // Home, Messages, Schedule
const TAB_EXTRA_SLOTS = TAB_MAX - CORE_TAB_COUNT;

const STUDENT_TAB_ORDER = ['music', 'studio', 'sight', 'academy', 'attendance'];
const FACULTY_TAB_ORDER = ['roster', 'music', 'academy'];

function isSlotEnabled(key: string, flags: ModuleFlags): boolean {
  const flagKey = SLOT_FLAG[key];
  return flagKey ? flags[flagKey] : true;
}

// Walks `order` once, in preference order, collecting up to
// TAB_EXTRA_SLOTS destinations that are enabled and not yet claimed (by key
// or by route) by an earlier pick or by the flagless-core tabs.
function fillTabSlots(order: string[], flags: ModuleFlags, usedKeys: Set<string>, usedRoutes: Set<string>): Destination[] {
  const picked: Destination[] = [];
  for (const key of order) {
    if (picked.length >= TAB_EXTRA_SLOTS) break;
    if (!isSlotEnabled(key, flags)) continue;
    const dest = (D as Record<string, Destination>)[key];
    if (usedKeys.has(dest.key) || usedRoutes.has(dest.to)) continue;
    picked.push(dest);
    usedKeys.add(dest.key);
    usedRoutes.add(dest.to);
  }
  return picked;
}

export function getTabItems(role: 'student' | 'faculty', flags: ModuleFlags): Destination[] {
  const usedKeys = new Set([D.home.key, D.messages.key, D.schedule.key]);
  const usedRoutes = new Set([D.home.to, D.messages.to, D.schedule.to]);
  const order = role === 'faculty' ? FACULTY_TAB_ORDER : STUDENT_TAB_ORDER;
  const filled = fillTabSlots(order, flags, usedKeys, usedRoutes);
  return [D.home, D.messages, ...filled, D.schedule];
}

// Per-user home grid layout, stored in user_preferences.home_tile_layout
// as versioned jsonb. Anything that isn't exactly {v:1, order: string[]}
// parses to null (= default layout) — never throws. The returned order is
// deduped and capped (64 entries) so a corrupt or hand-edited blob can't
// render duplicate tiles or grow unbounded.
// Spec: docs/superpowers/specs/2026-07-06-home-tile-customization-design.md
export interface TileLayout { v: 1; order: string[] }

export function parseTileLayout(raw: unknown): TileLayout | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.order)) return null;
  if (!o.order.every((k): k is string => typeof k === 'string')) return null;
  return { v: 1, order: [...new Set(o.order as string[])].slice(0, 64) };
}

// Today's default grid order, frozen at the point this pool started being
// built from the shared catalog rather than a hard-coded array — changing
// this list changes what every tenant sees on day one, so it's a deliberate,
// reviewable diff rather than an emergent side effect of catalog order.
//
// 'merch' → 'shop' 2026-08-09: 'merch' retired into 'shop' (mergedKeys.ts).
// Deliberately kept 'shop' HERE rather than dropping the slot outright —
// this list is what fills a fresh member's grid on day one, and the
// pre-merge grid included Merch in that default set, so keeping its
// successor here preserves that day-one default for the tenants it can
// still reach. 'shop' is now adminOnly (see navCatalog.ts), so for a
// non-admin member this slot silently resolves to nothing and the grid is
// one tile shorter — the same "stale/gated key drops silently" behavior
// every other entry in this list already gets when its gate is closed; see
// the byKey.get(...) filter below. The lookups here also run every key
// through resolveKey as a defensive backstop, so a FUTURE merge doesn't
// require remembering to hand-edit this frozen literal to avoid the same
// silent-drop bug getAppTiles's My Tools path had for 'merch' itself.
export const DEFAULT_GRID_ORDER = ['music', 'studio', 'sight', 'soundcloud', 'attendance', 'academy', 'tickets', 'planner', 'finance', 'shop'];

export interface AppTilesOptions {
  /**
   * Is the phone tab bar actually on screen? The grid must not repeat a
   * destination the tab bar already carries (Home / Messages / Calendar),
   * but ABOVE the tab bar's breakpoint there is no tab bar to repeat — and
   * suppressing those keys there is what made the keycap grid disagree with
   * the sidebar shelf, whose first two default entries are exactly Calendar
   * and Messages. Defaults to `true` (dedupe) so a caller that hasn't
   * measured the viewport keeps the conservative, never-duplicate behavior.
   * MobileBottomNav's own gate (useIsCompactNav, <768px) is the value to
   * pass.
   */
  tabBarVisible?: boolean;
}

export function getAppTiles(
  role: 'student' | 'faculty',
  flags: ModuleFlags,
  nav: NavContext,
  tools?: string[] | null,
  opts: AppTilesOptions = {},
): { primary: Destination[]; overflow: Destination[] } {
  // Dedupe against tab ROUTES, not keys — two distinct keys (e.g. Roster
  // and Attendance) can point at the same route, and the grid must not
  // repeat a destination the tab bar already surfaces.
  const tabRoutes = new Set(getTabItems(role, flags).map((t) => t.to));

  if (tools == null) {
    // Candidate pool = every resolved catalog entry with a grid surface
    // whose route the tab bar hasn't claimed. Catalog order groups by
    // section, which the grouped "More" UI relies on.
    const enabled: Destination[] = resolveNav(nav)
      .filter((e) => entrySurfaces(e).includes('grid') && !tabRoutes.has(e.to))
      .map((e) => ({ key: e.key, to: e.to, label: e.gridLabel ?? e.label, icon: e.gridIcon ?? e.icon, section: e.section, tone: e.tone }));

    // No record at all — the hook is still loading, or the member has never
    // saved a preference. Default grid frozen: first 8 enabled keys of
    // DEFAULT_GRID_ORDER in that order; EVERYTHING else (including all
    // sidebar-parity additions) goes to overflow, in catalog order.
    //
    // Deliberately NOT taken when `tools` is an empty array: that is a
    // stored, deliberate "I cleared everything" — the member removed every
    // keycap and tapped Done. Falling back to the default grid there would
    // make the grid disagree with the sidebar shelf (which has no such
    // fallback and correctly renders empty), and — because saveTools writes
    // optimistically — the cleared grid would visibly snap back to 8 tiles
    // the instant Done is tapped. Respect the empty set instead: Home and
    // All Tools always render, so nobody is stranded.
    const byKey = new Map(enabled.map((d) => [d.key, d]));
    const primary = DEFAULT_GRID_ORDER
      .map((k) => byKey.get(resolveKey(k)))
      .filter((d): d is Destination => d !== undefined)
      .slice(0, 8);
    const pinned = new Set(primary.map((d) => d.key));
    return { primary, overflow: enabled.filter((d) => !pinned.has(d.key)) };
  }

  // My Tools path. The pool here is deliberately WIDER than `enabled`: it
  // drops the `surfaces.includes('grid')` filter, so sidebar-only catalog
  // entries become keycaps too. Kevin's ruling is that the keycap grid shows
  // the SAME set as the sidebar shelf, and the shelf has no such filter —
  // Calendar and Messages are `surfaces: ['sidebar']` yet are the first two
  // entries of BOTH role defaults, so filtering by grid surface here made the
  // grid silently render a shorter list than the shelf (and, because
  // HomeTileGrid seeds its edit draft from `primary`, silently DELETED them
  // on the next save — see mergeGridOrder in myTools.ts for the second half
  // of that guard).
  //
  // 'home' stays out: it is implicit on every surface (sanitizeTools drops it
  // too), and the grid lives ON the home page.
  //
  // The tab-route dedupe applies only where the tab bar actually renders
  // (below md — see AppTilesOptions). Above it there is no tab bar carrying
  // Calendar/Messages, so suppressing them here is what made the grid
  // disagree with the shelf. The no-record branch above keeps the
  // unconditional dedupe: DEFAULT_GRID_ORDER is a frozen, separately-signed-
  // off list and this change is not licensed to alter it.
  const claimed = opts.tabBarVisible === false ? new Set<string>() : tabRoutes;
  const pool: Destination[] = resolveNav(nav)
    .filter((e) => e.key !== 'home' && !claimed.has(e.to))
    .map((e) => ({ key: e.key, to: e.to, label: e.gridLabel ?? e.label, icon: e.gridIcon ?? e.icon, section: e.section, tone: e.tone }));

  // Stale keys drop silently; the stored record is never rewritten, so
  // re-enabling a module restores its old spot. An empty array is a
  // deliberate, respected choice: primary comes back empty and everything
  // enabled lands in overflow, one tap away in More.
  //
  // resolveKeys here (resolve + dedupe) is the fix for a real regression
  // (Phase 5 review, 2026-08-09): a stored ['merch'] resolved correctly on
  // the sidebar shelf (selectShelfEntries calls resolveKeys itself) but NOT
  // here — this branch did a bare byKey.get(k), so a stored 'merch' key
  // resolved to nothing once the catalog entry was retired, and the home
  // grid silently lost the tile the shelf still showed under its new name
  // ('shop'). Verified: a stored ['merch'] used to yield primary: [] here.
  // The dedupe half matters separately: a record saved before the merge can
  // legitimately hold BOTH 'merch' and 'shop' (they were two independently
  // pinnable entries until this date), which a bare per-key resolve would
  // render as two identical tiles. See appDestinations.test.ts's "resolves
  // a merged key" / "collapse to one tile" tests.
  const byKey = new Map(pool.map((d) => [d.key, d]));
  const primary = resolveKeys(tools)
    .map((k) => byKey.get(k))
    .filter((d): d is Destination => d !== undefined);
  const pinned = new Set(primary.map((d) => d.key));
  return { primary, overflow: pool.filter((d) => !pinned.has(d.key)) };
}

/**
 * A run of keycaps under one heading. `name` is null for the loose band,
 * which renders with no heading at all.
 */
export interface TileBand {
  groupId: string | null;
  name: string | null;
  tiles: Destination[];
}

/**
 * Partition already-ordered grid tiles into bands: the loose tiles first
 * under no heading, then one band per group.
 *
 * Empty bands are dropped, which is how "empty groups never reach a live
 * surface" holds on the grid — a group can be empty because the member
 * hasn't filled it or because every tool in it is gated off for this
 * viewer, and a heading over zero tiles is noise either way. (The sidebar
 * shelf drops them in DashboardShell for the same reason; the My World
 * editor still shows them, which is where a member fills or deletes one.)
 *
 * Pure partitioning only: `primary` already arrives in loose-then-groups
 * order (HouseHome passes flattenShelf as getAppTiles' `tools`), so this
 * never reorders and never re-gates.
 *
 * `Pick`, not `ToolGroup`, because a band needs only identity, heading and
 * membership — HomeTileGrid re-partitions its edit draft by handing back the
 * bands it was given, which carry no collapse state.
 */
export function bandDestinations(
  primary: Destination[],
  groups: readonly Pick<ToolGroup, 'id' | 'name' | 'tools'>[],
): TileBand[] {
  const groupIdOfKey = new Map<string, string>();
  for (const group of groups) {
    for (const key of group.tools) groupIdOfKey.set(key, group.id);
  }
  const loose = primary.filter((tile) => !groupIdOfKey.has(tile.key));
  const bands: TileBand[] = [];
  if (loose.length > 0) bands.push({ groupId: null, name: null, tiles: loose });
  for (const group of groups) {
    const tiles = primary.filter((tile) => groupIdOfKey.get(tile.key) === group.id);
    if (tiles.length > 0) bands.push({ groupId: group.id, name: group.name, tiles });
  }
  return bands;
}

// Single source of truth for phone navigation surfaces (tab bar + app
// grid). Tabs = daily verbs; grid = everything else the tenant enabled.
// Spec: docs/superpowers/specs/2026-07-04-house-and-stage-design.md §5.1–5.2
import {
  Home, MessageSquare, Music, Disc3, Calendar, Users, ScanEye, Mic,
  GraduationCap, Ticket, ClipboardList, ListMusic, Wallet, Shirt,
  type LucideIcon,
} from 'lucide-react';
import { resolveNav, entrySurfaces, type NavContext, type NavSectionKey } from './navCatalog';

export interface ModuleFlags {
  hasViewer: boolean; hasPartTracks: boolean; hasStudio: boolean;
  hasSightReading: boolean; hasBoxOffice: boolean; hasConcertPlanner: boolean;
  hasMerch: boolean; hasFinance: boolean; hasAcademy: boolean; hasStore: boolean;
}

export interface Destination { key: string; to: string; label: string; icon: LucideIcon; section?: NavSectionKey; }

const D = {
  home:     { key: 'home',     to: '/dashboard',            label: 'Home',     icon: Home } as Destination,
  messages: { key: 'messages', to: '/messenger',            label: 'Messages', icon: MessageSquare } as Destination,
  music:    { key: 'music',    to: '/dashboard/viewer',     label: 'Music',    icon: Music } as Destination,
  studio:   { key: 'studio',   to: '/studio',               label: 'Studio',   icon: Disc3 } as Destination,
  schedule: { key: 'schedule', to: '/dashboard/calendar',   label: 'Schedule', icon: Calendar } as Destination,
  roster:   { key: 'roster',   to: '/dashboard/people',     label: 'Roster',   icon: Users } as Destination,
  tracks:   { key: 'tracks',   to: '/dashboard/part-tracks',label: 'Tracks',   icon: Mic } as Destination,
  sight:    { key: 'sight',    to: '/dashboard/sight-reading', label: 'Sight Reading', icon: ScanEye } as Destination,
  academy:  { key: 'academy',  to: '/dashboard/academy',    label: 'Academy',  icon: GraduationCap } as Destination,
  tickets:  { key: 'tickets',  to: '/box-office',           label: 'Tickets',  icon: Ticket } as Destination,
  planner:  { key: 'planner',  to: '/dashboard/concert-planner', label: 'Programs', icon: ListMusic } as Destination,
  attendance: { key: 'attendance', to: '/attendance',       label: 'Attendance', icon: ClipboardList } as Destination,
  finance:  { key: 'finance',  to: '/dashboard/finance',    label: 'Finance',  icon: Wallet } as Destination,
  merch:    { key: 'merch',    to: '/store',                label: 'Merch',    icon: Shirt } as Destination,
};

// Module flag gating a given destination key, when the destination is
// module-gated. Destinations absent from this map (e.g. attendance, roster)
// are always available ("flagless-core") and never skipped for being "off".
const SLOT_FLAG: Partial<Record<string, keyof ModuleFlags>> = {
  music: 'hasViewer', tracks: 'hasPartTracks', studio: 'hasStudio',
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

const STUDENT_TAB_ORDER = ['music', 'studio', 'tracks', 'sight', 'academy', 'attendance'];
const FACULTY_TAB_ORDER = ['roster', 'music', 'academy', 'tracks'];

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
export const DEFAULT_GRID_ORDER = ['music', 'tracks', 'studio', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance', 'merch'];

export function getAppTiles(role: 'student' | 'faculty', flags: ModuleFlags, nav: NavContext, layout?: TileLayout | null):
  { primary: Destination[]; overflow: Destination[] } {
  // Dedupe against tab ROUTES, not keys — two distinct keys (e.g. Roster
  // and Attendance) can point at the same route, and the grid must not
  // repeat a destination the tab bar already surfaces.
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

  // Custom layout: saved keys in saved order, filtered to what is still
  // enabled and un-claimed by the tab bar (stale keys silently drop; the
  // stored layout is never rewritten, so re-enabling a module restores
  // its old spot). Everything else enabled falls to overflow — newly
  // tenant-enabled modules land there, never inside a curated grid.
  const byKey = new Map(enabled.map((d) => [d.key, d]));
  const primary = layout.order
    .map((k) => byKey.get(k))
    .filter((d): d is Destination => d !== undefined);
  const pinned = new Set(primary.map((d) => d.key));
  return { primary, overflow: enabled.filter((d) => !pinned.has(d.key)) };
}

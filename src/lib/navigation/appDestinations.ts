// Single source of truth for phone navigation surfaces (tab bar + app
// grid). Tabs = daily verbs; grid = everything else the tenant enabled.
// Spec: docs/superpowers/specs/2026-07-04-house-and-stage-design.md §5.1–5.2
import {
  Home, MessageSquare, Music, Disc3, Calendar, Users, ScanEye, Mic,
  GraduationCap, Ticket, ClipboardList, ListMusic, Wallet, Shirt,
  type LucideIcon,
} from 'lucide-react';

export interface ModuleFlags {
  hasViewer: boolean; hasPartTracks: boolean; hasStudio: boolean;
  hasSightReading: boolean; hasBoxOffice: boolean; hasConcertPlanner: boolean;
  hasMerch: boolean; hasFinance: boolean; hasAcademy: boolean; hasStore: boolean;
}

export interface Destination { key: string; to: string; label: string; icon: LucideIcon; }

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

export function getAppTiles(role: 'student' | 'faculty', flags: ModuleFlags):
  { primary: Destination[]; overflow: Destination[] } {
  // Dedupe against tab ROUTES, not keys — two distinct keys (e.g. Roster
  // and Attendance) can point at the same route, and the grid must not
  // repeat a destination the tab bar already surfaces.
  const tabRoutes = new Set(getTabItems(role, flags).map((t) => t.to));
  const candidates: Array<[Destination, boolean]> = [
    [D.music, flags.hasViewer], [D.tracks, flags.hasPartTracks],
    [D.studio, flags.hasStudio], [D.sight, flags.hasSightReading],
    [D.attendance, true], [D.academy, flags.hasAcademy],
    [D.tickets, flags.hasBoxOffice], [D.planner, flags.hasConcertPlanner],
    [D.finance, flags.hasFinance], [D.merch, flags.hasMerch],
  ];
  const enabled = candidates
    .filter(([d, on]) => on && !tabRoutes.has(d.to))
    .map(([d]) => d);
  return { primary: enabled.slice(0, 8), overflow: enabled.slice(8) };
}

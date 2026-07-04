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
  hasMerch: boolean; hasFinance: boolean; hasAcademy: boolean;
}

export interface Destination { key: string; to: string; label: string; icon: LucideIcon; }

const D = {
  home:     { key: 'home',     to: '/dashboard',            label: 'Home',     icon: Home } as Destination,
  messages: { key: 'messages', to: '/messenger',            label: 'Messages', icon: MessageSquare } as Destination,
  music:    { key: 'music',    to: '/dashboard/viewer',     label: 'Music',    icon: Music } as Destination,
  studio:   { key: 'studio',   to: '/studio',               label: 'Studio',   icon: Disc3 } as Destination,
  schedule: { key: 'schedule', to: '/dashboard/calendar',   label: 'Schedule', icon: Calendar } as Destination,
  roster:   { key: 'roster',   to: '/attendance',           label: 'Roster',   icon: Users } as Destination,
  tracks:   { key: 'tracks',   to: '/dashboard/part-tracks',label: 'Tracks',   icon: Mic } as Destination,
  sight:    { key: 'sight',    to: '/dashboard/sight-reading', label: 'Sight Reading', icon: ScanEye } as Destination,
  academy:  { key: 'academy',  to: '/dashboard/academy',    label: 'Academy',  icon: GraduationCap } as Destination,
  tickets:  { key: 'tickets',  to: '/box-office',           label: 'Tickets',  icon: Ticket } as Destination,
  planner:  { key: 'planner',  to: '/dashboard/concert-planner', label: 'Programs', icon: ListMusic } as Destination,
  attendance: { key: 'attendance', to: '/attendance',       label: 'Attendance', icon: ClipboardList } as Destination,
  finance:  { key: 'finance',  to: '/dashboard/finance',    label: 'Finance',  icon: Wallet } as Destination,
  merch:    { key: 'merch',    to: '/dashboard/merch',      label: 'Merch',    icon: Shirt } as Destination,
};

// Module flag gating a given destination key, when the destination is
// module-gated. Destinations absent from this map (e.g. attendance) are
// always available and never skipped for being "off".
const SLOT_FLAG: Partial<Record<string, keyof ModuleFlags>> = {
  music: 'hasViewer', tracks: 'hasPartTracks', studio: 'hasStudio',
  sight: 'hasSightReading', academy: 'hasAcademy',
};

// Picks the first destination in `order` that is (a) module-enabled and
// (b) not already used for another slot, falling back to Academy then
// Attendance (which has no gating flag) so a slot is never left empty and
// never collides with an already-chosen destination.
function pickSlot(order: string[], flags: ModuleFlags, used: Set<string>): Destination {
  for (const key of order) {
    const dest = (D as Record<string, Destination>)[key];
    const flagKey = SLOT_FLAG[key];
    const enabled = flagKey ? flags[flagKey] : true;
    if (enabled && !used.has(dest.key)) return dest;
  }
  if (flags.hasAcademy && !used.has(D.academy.key)) return D.academy;
  return D.attendance;
}

export function getTabItems(role: 'student' | 'faculty', flags: ModuleFlags): Destination[] {
  if (role === 'faculty') {
    return [D.home, D.messages, D.roster, flags.hasViewer ? D.music : D.academy, D.schedule];
  }
  const used = new Set([D.home.key, D.messages.key]);
  const third = pickSlot(['music', 'tracks', 'academy'], flags, used);
  used.add(third.key);
  const fourth = pickSlot(['studio', 'tracks', 'sight', 'academy'], flags, used);
  used.add(fourth.key);
  return [D.home, D.messages, third, fourth, D.schedule];
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

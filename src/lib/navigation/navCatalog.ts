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

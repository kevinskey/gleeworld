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
  PenLine, NotebookPen, BookOpen,
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
  { key: 'messages', to: '/dashboard/messenger', label: 'Messages',       icon: MessageSquare, section: 'today', tone: 'bg-cyan-50 text-cyan-600',   tourId: 'nav-messenger',      surfaces: ['sidebar'] },
  { key: 'calendar', to: '/dashboard/calendar',  label: 'Calendar',       icon: Calendar,      section: 'today', tone: 'bg-purple-50 text-purple-600', tourId: 'nav-calendar',     surfaces: ['sidebar'] },
  { key: 'notes',    to: '/planner',             label: 'Notes',          icon: NotebookPen,   section: 'today', tone: 'bg-amber-50 text-amber-700',   tourId: 'nav-notes', gate: { module: 'planner' } },
  // Music
  { key: 'music-library', to: '/dashboard/music-library', label: 'Music Library', icon: Music,    section: 'music', tone: 'bg-rose-50 text-rose-600',     tourId: 'nav-music-library' },
  { key: 'repertoire',    to: '/dashboard/repertoire',    label: 'Repertoire',    icon: BookOpen, section: 'music', tone: 'bg-sky-50 text-sky-700',       tourId: 'nav-repertoire' },
  { key: 'music',         to: '/dashboard/viewer',        label: 'Viewer',        icon: ScanEye,  section: 'music', tone: 'bg-amber-50 text-amber-700',   tourId: 'nav-viewer',        gridLabel: 'Music', gridIcon: Music, gate: { module: 'viewer' } },
  { key: 'sight',         to: '/dashboard/sight-reading', label: 'Sight Reading', icon: Eye,      section: 'music', tone: 'bg-violet-50 text-violet-600', tourId: 'nav-sight-reading', gridIcon: ScanEye, gate: { module: 'sight_reading' } },
  { key: 'tracks',        to: '/dashboard/part-tracks',   label: 'Part Tracks',   icon: Mic,      section: 'music', tone: 'bg-indigo-50 text-indigo-600', tourId: 'nav-part-tracks',   gridLabel: 'Tracks', gate: { module: 'part_tracks' } },
  { key: 'media-library', to: '/dashboard/media-library', label: 'Media Library', icon: Images,   section: 'music', tone: 'bg-orange-50 text-orange-600', tourId: 'nav-media-library' },
  { key: 'librarian',     to: '/dashboard/librarian',     label: 'Librarian',     icon: LibraryBig, section: 'music', tone: 'bg-slate-50 text-slate-600', tourId: 'nav-librarian',    gate: { module: 'librarian', librarianOnly: true } },
  { key: 'partner-portal', to: '/partner', label: 'Partner Portal', icon: Store, section: 'music', tone: 'bg-emerald-50 text-emerald-700', tourId: 'nav-partner-portal' },
  // Teach
  { key: 'academy',      to: '/dashboard/academy',             label: 'Academy',      icon: GraduationCap, section: 'teach', tone: 'bg-primary text-primary-foreground', tourId: 'nav-academy', hero: true },
  { key: 'office-hours', to: '/dashboard/office-hours',        label: 'Studio Hours', icon: CalendarClock, section: 'teach', tone: 'bg-emerald-50 text-emerald-600',     tourId: 'nav-office-hours' },
  { key: 'practice',     to: '/dashboard/practice-recordings', label: 'Practice',     icon: Mic,           section: 'teach', tone: 'bg-teal-50 text-teal-700',           tourId: 'nav-practice', gate: { adminOnly: true } },
  // Make
  { key: 'studio',      to: '/studio',                label: 'Studio',      icon: Disc3,  section: 'make', tone: 'bg-sky-50 text-sky-600',   tourId: 'nav-studio', gate: { module: 'studio' } },
  { key: 'video',       to: '/video',                 label: 'Videos',      icon: Film,   section: 'make', tone: 'bg-pink-50 text-pink-600', tourId: 'nav-video' },
  // 'youtube' nav entry removed 2026-07-22 — /youtube now redirects to /video,
  // which hosts the multi-provider Video Library (paste any streaming URL,
  // upload files, tabs/tags/filters, share, playlists).
  { key: 'music-tools', to: '/dashboard/music-tools', label: 'Music Tools', icon: Wrench, section: 'make', tone: 'bg-cyan-50 text-cyan-600', tourId: 'nav-music-tools' },
  { key: 'songwriting', to: '/songwriting', label: 'Songwriting', icon: PenLine, section: 'make', tone: 'bg-violet-50 text-violet-600', tourId: 'nav-songwriting', gate: { module: 'songwriting' } },
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
  // Destination is the graduates PAGE BUILDER (GraduatesManagementModule opens
  // on its Page Builder tab), which authors the public /alumni page — so it is
  // labelled as a page editor and gated adminOnly to match its sibling Fan
  // Page. Gating on the module alone let any member of an alumni-enabled
  // tenant open the editor and hit RLS write failures instead of simply not
  // seeing the entry.
  { key: 'graduates', to: '/dashboard/alumni', label: 'Graduates Page', icon: GraduationCap, section: 'reach', tone: 'bg-teal-50 text-teal-600',       tourId: 'nav-alumni', gate: { module: 'alumni', adminOnly: true } },
  { key: 'merch',     to: '/store',            label: 'Merch',     icon: Shirt,         section: 'reach', tone: 'bg-amber-50 text-amber-600',     tourId: 'nav-merch-grid', surfaces: ['grid'], gate: { module: 'merch' } },
  // Money
  { key: 'box-office', to: '/dashboard/box-office', label: 'Box Office', icon: Ticket,     section: 'money', tone: 'bg-rose-50 text-rose-700',       tourId: 'nav-box-office', gate: { module: 'box_office', adminOnly: true } },
  { key: 'finance',    to: '/dashboard/finance',    label: 'Finance',    icon: DollarSign, section: 'money', tone: 'bg-emerald-50 text-emerald-600', tourId: 'nav-finance', gridIcon: Wallet, gate: { module: 'finance' } },
  { key: 'tickets',    to: '/box-office',           label: 'Tickets',    icon: Ticket,     section: 'money', tone: 'bg-rose-50 text-rose-700',       tourId: 'nav-tickets-grid', surfaces: ['grid'], gate: { module: 'box_office' } },
  { key: 'fundraising', to: '/dashboard/fundraising', label: 'Fundraising Store', icon: Shirt, section: 'money', tone: 'bg-amber-50 text-amber-600', tourId: 'nav-fundraising', gate: { adminOnly: true } },
  // People — tenant user management (invite / promote / disable / CSV
  // bulk import). adminOnly is now authoritative in the code, not just
  // via gw_tenant_nav_prefs — a fresh tenant with no prefs seeded would
  // otherwise expose the roster + invite dialog to every student.
  { key: 'people',     to: '/dashboard/users', label: 'People',     icon: Users,         section: 'people', tone: 'bg-cyan-50 text-cyan-600', tourId: 'nav-people', gate: { adminOnly: true } },
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

// ---------------------------------------------------------------------------
// Hideable-nav settings (Workspace Settings → Navigation tab)
//
// Tenant super-admins hide nav items per role; hidden routes are stored in
// gw_tenant_nav_prefs.hidden_items and applied by resolveNav's hiddenRoutes
// filter — which covers the sidebar, mobile drawer, AND home grid. Derived
// from NAV_CATALOG so this list can never drift from what actually renders
// (its hand-maintained predecessor at src/lib/nav/navCatalog.ts had drifted:
// /dashboard/tour and /dashboard/liturgy-planner never matched a real route,
// so hiding Tour Manager / Liturgy Planner silently failed).

// Roles that actually render the Command Center sidebar. 'fan' and
// 'graduate' were removed: those roles never reach DashboardShell at all —
// useRoleBasedRedirect sends fans to /fan and graduates to /alumni, which are
// public block-built pages with their own editors (Reach → Fan Page /
// Graduates Page). Listing them here offered a preview of a sidebar they
// never see, and let admins hide nav items for an audience that reads none
// of it. Any gw_tenant_nav_prefs rows still keyed to those roles are simply
// never read.
export type NavRole = 'admin' | 'student' | 'member';

export const HIDEABLE_NAV_ROLES: { value: NavRole; label: string }[] = [
  { value: 'admin',    label: 'Tenant admins' },
  { value: 'student',  label: 'Students' },
  { value: 'member',   label: 'Members' },
];

// Capability flags each previewable role actually holds. Preview used to
// swap only the hidden_items list, which left the capability gates reading
// the real (super-admin) profile — so "preview as Students" still rendered
// Users, Settings and Tenants. That made the preview a lie for any tenant
// that hadn't hand-hidden those rows. These flags close that gap.
//
// Only 'admin' carries privilege; student and member are unprivileged in the
// nav's eyes. canLibrarian is a per-user grant rather than a role, but no
// non-admin role implies it, so false is correct.
const PREVIEW_ROLE_CAPS: Record<NavRole, Pick<NavContext, 'isTenantAdmin' | 'isPlatformAdmin' | 'canLibrarian'>> = {
  admin:    { isTenantAdmin: true,  isPlatformAdmin: false, canLibrarian: true  },
  student:  { isTenantAdmin: false, isPlatformAdmin: false, canLibrarian: false },
  member:   { isTenantAdmin: false, isPlatformAdmin: false, canLibrarian: false },
};

/**
 * Narrow a NavContext to what `role` would see. Pass role=null (no preview
 * active) to get `ctx` back unchanged.
 *
 * Module access is deliberately NOT overridden: modules are a tenant-level
 * entitlement, not a role capability, so a previewed student still sees the
 * same module set their tenant actually has.
 *
 * Callers must only pass a non-null role for users who are genuinely
 * super-admins — this function does not re-check that. It can only ever
 * remove capabilities relative to a real super-admin, so a forged
 * sessionStorage value cannot escalate.
 */
export function applyPreviewRole(ctx: NavContext, role: NavRole | null): NavContext {
  if (!role) return ctx;
  const caps = PREVIEW_ROLE_CAPS[role];
  // A role with no caps entry (e.g. a value retired from NavRole that reached
  // us anyway) must not spread `undefined` and silently leave full admin
  // capabilities in place. Treat it as no preview.
  if (!caps) return ctx;
  return { ...ctx, ...caps };
}

/** Which HouseHome tile set a previewed role should get. */
export function previewRoleIsFaculty(role: NavRole): boolean {
  return role === 'admin';
}

export interface HideableNavItem {
  /** Route path — the stable identity stored in hidden_items. */
  path: string;
  label: string;
  section: string;
}

// Platform-admin-only entries (Tenants) are excluded: they never render for
// the roles this feature can hide from. Grid-only entries (Attendance,
// Tickets, Merch) ARE included — hiding them removes the grid tile.
export function hideableNavItems(): HideableNavItem[] {
  return NAV_CATALOG
    .filter((e) => !e.gate?.platformAdminOnly)
    .map((e) => ({ path: e.to, label: e.label, section: NAV_SECTION_LABELS[e.section] }));
}

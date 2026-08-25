// Single source of truth for app navigation destinations. Consumed by:
//   - DashboardShell desktop sidebar + mobile drawer (grouped by section)
//   - the home grid tile pool (grid surfaces, minus tab-bar routes)
// Entry values are the former DashboardShell inline arrays, verbatim.
// `key` is stored in user_preferences.home_tile_layout — NEVER rename.
// gridLabel/gridIcon keep the shipped grid tiles (short word / original
// icon) where the sidebar historically differs.
// Spec: docs/superpowers/specs/2026-07-06-nav-catalog-parity-design.md
import {
  Globe,
  Home, MessageSquare, Calendar, Music, ScanEye, Eye, Mic, Images, LibraryBig,
  GraduationCap, CalendarClock, Disc3, Film, Wrench, ClipboardList, ListMusic,
  Church, Route as RouteIcon, ScanLine, Megaphone, Heart, Newspaper, Store, ShoppingBag,
  Shirt, Ticket, DollarSign, Wallet, Users, Settings, TrendingUp, Sparkles,
  PenLine, NotebookPen, BookOpen, HeartHandshake, Armchair, CreditCard, Receipt,
  HandHeart, ConciergeBell, QrCode, Award,
  type LucideIcon, FileText } from 'lucide-react';

export type NavSectionKey =
  'today' | 'church' | 'music' | 'teach' | 'make' | 'plan' | 'reach' | 'money' | 'people' | 'admin';

export const NAV_SECTION_LABELS: Record<NavSectionKey, string> = {
  today: 'Today', church: 'Church', music: 'Music', teach: 'Teach', make: 'Make',
  plan: 'Plan', reach: 'Reach', money: 'Money', people: 'People', admin: 'Admin',
};

export interface NavGate {
  module?: string;
  moduleAny?: string[];
  adminOnly?: boolean;
  platformAdminOnly?: boolean;
  librarianOnly?: boolean;
  partnerOnly?: boolean;
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
  end?: boolean;
  surfaces?: Array<'sidebar' | 'grid'>;
  gate?: NavGate;
}

export const NAV_CATALOG: CatalogEntry[] = [
  // Today — tab-bar territory; sidebar-only, never grid tiles.
  { key: 'home',     to: '/dashboard',           label: 'Command Center', icon: Home,          section: 'today', tone: 'bg-primary/10 text-primary', tourId: 'nav-command-center', end: true, surfaces: ['sidebar'] },
  // The way BACK OUT: the tenant's public site lives at the host root. No
  // gate — every member may want the page they share with the world.
  { key: 'public-site', to: '/', label: 'Public Site', icon: Globe, section: 'today', tone: 'bg-sky-50 text-sky-600', tourId: 'nav-public-site', end: true },
  { key: 'messages', to: '/dashboard/messenger', label: 'Messages',       icon: MessageSquare, section: 'today', tone: 'bg-cyan-50 text-cyan-600',   tourId: 'nav-messenger',      surfaces: ['sidebar'] },
  { key: 'calendar', to: '/dashboard/calendar',  label: 'Calendar',       icon: Calendar,      section: 'today', tone: 'bg-purple-50 text-purple-600', tourId: 'nav-calendar',     surfaces: ['sidebar'] },
  { key: 'notes',    to: '/planner',             label: 'Notes',          icon: NotebookPen,   section: 'today', tone: 'bg-amber-50 text-amber-700',   tourId: 'nav-notes', gate: { module: 'planner' } },
  { key: 'documents', to: '/dashboard/documents', label: 'Documents', icon: FileText, section: 'today', tone: 'bg-blue-50 text-blue-600', tourId: 'nav-documents' },
  // The Bible — full text, highlights, Apple Pencil underlines, notes.
  // Formerly "Prayer App"; the prayers and daily readings still live at
  // /prayer and are reachable from inside the Bible page.
  { key: 'bible',    to: '/bible',               label: 'The Bible',      icon: BookOpen,      section: 'church', tone: 'bg-violet-50 text-violet-700', tourId: 'nav-bible' },
  { key: 'concierge', to: '/dashboard/concierge', label: 'Concierge',     icon: ConciergeBell, section: 'today', tone: 'bg-sky-50 text-sky-600',       tourId: 'nav-concierge' },
  // Music
  { key: 'music-library',   to: '/dashboard/music-library', label: 'Music Library',  icon: Music,    section: 'music', tone: 'bg-rose-50 text-rose-600',     tourId: 'nav-music-library' },
  { key: 'music',         to: '/dashboard/viewer',        label: 'Viewer',        icon: ScanEye,  section: 'music', tone: 'bg-amber-50 text-amber-700',   tourId: 'nav-viewer',        gridLabel: 'Music', gridIcon: Music, gate: { module: 'viewer' } },
  { key: 'sight',         to: '/dashboard/reading-music', label: 'Reading Music', icon: Eye,      section: 'music', tone: 'bg-violet-50 text-violet-600', tourId: 'nav-reading-music', gridIcon: ScanEye, gate: { module: 'sight_reading' } },
  { key: 'part-tracks',   to: '/dashboard/part-tracks',   label: 'Part Tracks',   icon: ListMusic, section: 'music', tone: 'bg-fuchsia-50 text-fuchsia-600', tourId: 'nav-part-tracks' },
  { key: 'media-library', to: '/dashboard/media-library', label: 'Media Library', icon: Images,   section: 'music', tone: 'bg-orange-50 text-orange-600', tourId: 'nav-media-library' },
  // Streams the tenant's soundcloud.com profile through SoundCloud's own
  // widget, grouped by the sets on that account. Profile comes from
  // gw_branding_settings.soundcloud_url; unset shows a setup prompt.
  // Not to be confused with /soundcloud, the 2025 OAuth search page.
  { key: 'soundcloud',    to: '/dashboard/soundcloud',    label: 'SoundCloud',    icon: Music,    section: 'music', tone: 'bg-sky-50 text-sky-600',       tourId: 'nav-soundcloud' },
  // The partner sheet-music marketplace (buyer side). Everyone can browse
  // and buy; partners manage their catalog via Partner Portal below.
  { key: 'music-store',   to: '/store',                   label: 'Music Store',   icon: ShoppingBag, section: 'music', tone: 'bg-emerald-50 text-emerald-700', tourId: 'nav-music-store' },
  { key: 'librarian',     to: '/dashboard/librarian',     label: 'Librarian',     icon: LibraryBig, section: 'music', tone: 'bg-slate-50 text-slate-600', tourId: 'nav-librarian',    gate: { module: 'librarian', librarianOnly: true } },
  { key: 'partner-portal', to: '/partner', label: 'Partner Portal', icon: Store, section: 'music', tone: 'bg-emerald-50 text-emerald-700', tourId: 'nav-partner-portal', gate: { partnerOnly: true } },
  // Teach
  { key: 'academy',      to: '/dashboard/academy',             label: 'Academy',      icon: GraduationCap, section: 'teach', tone: 'bg-primary text-primary-foreground', tourId: 'nav-academy' },
  { key: 'office-hours', to: '/dashboard/office-hours',        label: 'Studio Hours', icon: CalendarClock, section: 'teach', tone: 'bg-emerald-50 text-emerald-600',     tourId: 'nav-office-hours' },
  // Reference directory (public, all 49 states) and the director's own
  // workspace are separate destinations: one answers "what does my state
  // require", the other "are my students ready".
  { key: 'all-state',    to: '/all-state',                     label: 'All-State',    icon: Award,         section: 'teach', tone: 'bg-indigo-50 text-indigo-600',       tourId: 'nav-all-state', gate: { module: 'all_state' } },
  { key: 'all-state-cohorts', to: '/dashboard/all-state',      label: 'All-State Roster', icon: Users,     section: 'teach', tone: 'bg-indigo-50 text-indigo-700',       tourId: 'nav-all-state-cohorts', gate: { module: 'all_state', adminOnly: true } },
  // Student surface — no adminOnly gate. Shows an empty state for anyone not
  // in a cohort, which is cheaper than hiding it and leaving students unsure
  // whether the feature exists.
  { key: 'my-all-state', to: '/dashboard/my-all-state',        label: 'My All-State', icon: Award,         section: 'teach', tone: 'bg-indigo-50 text-indigo-600',       tourId: 'nav-my-all-state', gate: { module: 'all_state' } },
  // Editorial canon for every state — GleeWorld staff only, not tenant admins.
  { key: 'all-state-admin', to: '/dashboard/all-state-admin',  label: 'All-State Data', icon: Award,       section: 'admin', tone: 'bg-indigo-50 text-indigo-600',      tourId: 'nav-all-state-admin', gate: { platformAdminOnly: true }, surfaces: ['sidebar'] },
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
  { key: 'liturgy',   to: '/dashboard/liturgy',         label: 'Liturgy Planner', icon: Church,        section: 'church', tone: 'bg-amber-50 text-amber-700',     tourId: 'nav-liturgy-planner', gate: { module: 'liturgy_planner' } },
  { key: 'worship-aids', to: '/dashboard/worship-aids',  label: 'Worship Aids',    icon: FileText,      section: 'church', tone: 'bg-amber-50 text-amber-700',     tourId: 'nav-worship-aids', gate: { module: 'liturgy_planner' } },
  { key: 'tour',      to: '/tour-manager',              label: 'Travel Manager',  icon: RouteIcon,     section: 'plan', tone: 'bg-blue-50 text-blue-600',       tourId: 'nav-tour-manager', gate: { module: 'tour' } },
  { key: 'seating-charts', to: '/seating-charts',       label: 'Seating Charts',  icon: Armchair,      section: 'plan', tone: 'bg-indigo-50 text-indigo-600',   tourId: 'nav-seating-charts' },
  { key: 'auditions', to: '/dashboard/auditions',       label: 'Auditions',       icon: ScanLine,      section: 'plan', tone: 'bg-lime-50 text-lime-600',       tourId: 'nav-auditions', gate: { module: 'auditions' } },
  // Reach
  { key: 'pr-hub',    to: '/dashboard/pr-hub', label: 'PR Hub',    icon: Megaphone,     section: 'reach', tone: 'bg-fuchsia-50 text-fuchsia-600', tourId: 'nav-pr-hub', gate: { module: 'pr_hub' } },
  { key: 'fan-page',  to: '/admin/fan-page',   label: 'Fan Page',  icon: Heart,         section: 'reach', tone: 'bg-rose-50 text-rose-700',       tourId: 'nav-fan-page', gate: { adminOnly: true } },
  { key: 'feeds',     to: '/dashboard/feeds',  label: 'Feeds',     icon: Newspaper,     section: 'reach', tone: 'bg-blue-50 text-blue-600',       tourId: 'nav-feeds', gate: { module: 'feeds' } },
  { key: 'qr-codes',  to: '/qr-generator',     label: 'QR Codes',  icon: QrCode,        section: 'reach', tone: 'bg-slate-50 text-slate-600',     tourId: 'nav-qr-codes', gate: { adminOnly: true } },
  // Consolidated 2026-08-09: this used to be two catalog entries pointing at
  // the SAME ProductManagement component ('shop' here, and a grid-only
  // 'merch' at /store/products) — a member browsing All Tools saw "Store"
  // and "Merch" side by side and landed on one identical admin screen
  // either way. 'merch' is retired via MERGED_KEYS (myTools.ts), not
  // deleted outright, so any stored member layout referencing it still
  // resolves here. Labelled "Store Admin" (not "Store") to read as
  // distinct from 'music-store' (Music Store, /store — the separate
  // buyer-facing marketplace). adminOnly added here at the same time:
  // ProductManagement composes Orders/Customers/Payments/Discounts/Tax
  // managers reading gw_orders/gw_payments/gw_refunds/gw_disputes, and the
  // gate used to be module-only, so any member of a merch/store-enabled
  // tenant could open it. ProductManagement also self-gates now (a member
  // can still type the URL) — see its own admin check.
  { key: 'shop',      to: '/dashboard/shop',   label: 'Store Admin', icon: Store,         section: 'reach', tone: 'bg-amber-50 text-amber-600',     tourId: 'nav-shop', gate: { moduleAny: ['merch', 'store'], adminOnly: true } },
  // Destination is the graduates PAGE BUILDER (GraduatesManagementModule opens
  // on its Page Builder tab), which authors the public /alumni page — so it is
  // labelled as a page editor and gated adminOnly to match its sibling Fan
  // Page. Gating on the module alone let any member of an alumni-enabled
  // tenant open the editor and hit RLS write failures instead of simply not
  // seeing the entry.
  { key: 'graduates', to: '/dashboard/alumni', label: 'Graduates Page', icon: GraduationCap, section: 'reach', tone: 'bg-teal-50 text-teal-600',       tourId: 'nav-alumni', gate: { module: 'alumni', adminOnly: true } },
  // 'merch' retired 2026-08-09 — see the comment on 'shop' above. Key kept
  // out of the catalog on purpose (NEVER rename/reuse a key); MERGED_KEYS
  // resolves stored references to 'shop' instead.
  // Money
  { key: 'my-fees',   to: '/dashboard/my-fees',    label: 'My Fees',    icon: CreditCard, section: 'money', tone: 'bg-sky-50 text-sky-700',         tourId: 'nav-my-fees' },
  { key: 'fees-admin', to: '/dashboard/fees',      label: 'Fees',       icon: Receipt,    section: 'money', tone: 'bg-emerald-50 text-emerald-700', tourId: 'nav-fees-admin', gate: { adminOnly: true } },
  { key: 'box-office', to: '/dashboard/box-office', label: 'Box Office', icon: Ticket,     section: 'money', tone: 'bg-rose-50 text-rose-700',       tourId: 'nav-box-office', gate: { module: 'box_office', adminOnly: true } },
  { key: 'finance',    to: '/dashboard/finance',    label: 'Finance',    icon: DollarSign, section: 'money', tone: 'bg-emerald-50 text-emerald-600', tourId: 'nav-finance', gridIcon: Wallet, gate: { module: 'finance' } },
  { key: 'tickets',    to: '/box-office',           label: 'Tickets',    icon: Ticket,     section: 'money', tone: 'bg-rose-50 text-rose-700',       tourId: 'nav-tickets-grid', surfaces: ['grid'], gate: { module: 'box_office' } },
  // Labelled with the partner's name deliberately (Kevin, 2026-08-09). This is NOT a
  // store GleeWorld runs: provision-tsb-store creates a T-Shirt Brothers group store,
  // TSB holds the catalog, fulfils, and collects, and the tenant keeps 15%. None of the
  // commerce-core rules (server-side prices, webhook fulfilment, our order model,
  // Connect account resolution) apply. A bare "Store" label invited directors to expect
  // their own inventory and land on someone else's platform. NEVER rename the `key`.
  { key: 'fundraising', to: '/dashboard/fundraising', label: 'Fundraising (T-Shirt Brothers)', icon: Shirt, section: 'money', tone: 'bg-amber-50 text-amber-600', tourId: 'nav-fundraising', gate: { adminOnly: true } },
  // Peer-to-peer donation pages — a different revenue motion from the
  // T-Shirt Brothers apparel storefront above, hence a separate entry.
  { key: 'giving',      to: '/dashboard/giving',      label: 'Giving',      icon: HandHeart, section: 'money', tone: 'bg-pink-50 text-pink-600', tourId: 'nav-giving', gate: { module: 'giving', adminOnly: true } },
  // People — tenant user management (invite / promote / disable / CSV
  // bulk import). adminOnly is now authoritative in the code, not just
  // via gw_tenant_nav_prefs — a fresh tenant with no prefs seeded would
  // otherwise expose the roster + invite dialog to every student.
  { key: 'people',     to: '/dashboard/users', label: 'People',     icon: Users,         section: 'people', tone: 'bg-cyan-50 text-cyan-600', tourId: 'nav-people', gate: { adminOnly: true } },
  { key: 'parents',    to: '/dashboard/workspace?tab=parents', label: 'Parents', icon: HeartHandshake, section: 'people', tone: 'bg-rose-50 text-rose-600', tourId: 'nav-parents', gate: { adminOnly: true } },
  { key: 'attendance', to: '/attendance',      label: 'Attendance', icon: ClipboardList, section: 'people', tone: 'bg-cyan-50 text-cyan-600', tourId: 'nav-attendance-grid', surfaces: ['grid'] },
  // Admin
  { key: 'site-setup', to: '/admin/public-page',   label: 'Site Setup', icon: Settings,   section: 'admin', tone: 'bg-fuchsia-50 text-fuchsia-700', tourId: 'nav-site-setup', gate: { adminOnly: true } },
  { key: 'partners',   to: '/admin/partners',      label: 'Partners',   icon: Store,      section: 'admin', tone: 'bg-emerald-50 text-emerald-700', tourId: 'nav-admin-partners', gate: { adminOnly: true } },
  { key: 'analytics',  to: '/dashboard/analytics', label: 'Analytics',  icon: TrendingUp, section: 'admin', tone: 'bg-purple-50 text-purple-600',   tourId: 'nav-analytics' },
  { key: 'settings',   to: '/dashboard/workspace', label: 'Settings',   icon: Settings,   section: 'admin', tone: 'bg-muted text-muted-foreground', tourId: 'nav-settings' },
  { key: 'tenants',    to: '/admin/tenants',       label: 'Tenants',    icon: Sparkles,   section: 'admin', tone: 'bg-indigo-50 text-indigo-700',   tourId: 'nav-platform-tenants', surfaces: ['sidebar'], gate: { platformAdminOnly: true } },
];

export interface NavContext {
  hasModule: (key: string) => boolean;
  isTenantAdmin: boolean;
  isPlatformAdmin: boolean;
  canLibrarian: boolean;
  isPartner: boolean;
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
  if (gate.partnerOnly && !ctx.isPartner) return false;
  return true;
}

// Total: missing/false ctx fields can only under-show, never leak a
// gated destination.
export function resolveNav(ctx: NavContext): CatalogEntry[] {
  return NAV_CATALOG.filter((e) => gateOpen(e.gate, ctx) && !ctx.hiddenRoutes.has(e.to));
}

/**
 * Every module id any catalog entry gates on.
 *
 * The shells (DashboardShell, MyWorldPage) loop this to build the
 * `moduleAccess` map that backs `NavContext.hasModule`, so a gated entry is
 * only ever visible if its module id appears here. This used to be a
 * hand-maintained array duplicated in both shells, and forgetting to add a
 * key hid the destination completely — no error, no warning, nothing in the
 * console. That cost us All-State on its first deploy and Auctions on its
 * second, which is twice too often for a list a computer can derive.
 *
 * Computed once at module load from the static catalog, so the shells' hook
 * count is fixed across renders — the property the hand-written list was
 * there to guarantee.
 */
export const GATED_MODULE_KEYS: readonly string[] = (() => {
  const keys = new Set<string>();
  for (const entry of NAV_CATALOG) {
    if (entry.gate?.module) keys.add(entry.gate.module);
    for (const m of entry.gate?.moduleAny ?? []) keys.add(m);
  }
  // 'alumni' has no catalog entry gating on it today but the shells have
  // always probed it; keep it so removing it is a separate, deliberate change.
  keys.add('alumni');
  return Object.freeze([...keys]);
})();

// Every page the assistant may offer to open, derived from the catalog so
// it can never drift from the real nav (its predecessor was a hand-kept
// key list in the assistant-chat edge fn that missed every add-on shipped
// after it was written). Deliberately ungated: gating needs live role +
// module state the AssistantProvider doesn't carry, and each gated route
// already defends itself — worst case the assistant opens a page that
// shows its own access message, which beats silently pretending the page
// doesn't exist.
export function assistantNavTargets(): Array<{ key: string; label: string }> {
  const seen = new Set<string>();
  const targets: Array<{ key: string; label: string }> = [];
  for (const e of NAV_CATALOG) {
    if (seen.has(e.key)) continue;
    seen.add(e.key);
    targets.push({ key: e.key, label: e.label });
  }
  return targets;
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
const PREVIEW_ROLE_CAPS: Record<NavRole, Pick<NavContext, 'isTenantAdmin' | 'isPlatformAdmin' | 'canLibrarian' | 'isPartner'>> = {
  admin:    { isTenantAdmin: true,  isPlatformAdmin: false, canLibrarian: true,  isPartner: false },
  student:  { isTenantAdmin: false, isPlatformAdmin: false, canLibrarian: false, isPartner: false },
  member:   { isTenantAdmin: false, isPlatformAdmin: false, canLibrarian: false, isPartner: false },
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

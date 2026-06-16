// DashboardShell — sidebar + topbar wrapper for the Command Center page.
//
// Scoped to the /dashboard route. The global UniversalHeader is suppressed
// in App.tsx for this route (showHeader={false}) so this shell can take over.
// All other pages continue to use UniversalLayout's normal header/footer.
//
// Layout:
//   ┌────────────┬────────────────────────────────────────┐
//   │  Sidebar   │  TopBar  (search, +, bell, avatar)     │
//   │ (logo,     ├────────────────────────────────────────┤
//   │  nav,      │  Page content (children)               │
//   │  tenant)   │                                        │
//   └────────────┴────────────────────────────────────────┘

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ProductTour } from '@/components/tour/ProductTour';
import {
  Home,
  Calendar,
  GraduationCap,
  MessageSquare,
  Music,
  Eye,
  Ticket,
  Mic,
  ScanLine,
  LibraryBig,
  Megaphone,
  Images,
  Boxes,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  DollarSign,
  ShoppingCart,
  Newspaper,
  Users,
  TrendingUp,
  CalendarClock,
  Settings,
  Search,
  Plus,
  Bell,
  LogOut,
  Menu,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useMessenger } from '@/contexts/MessengerContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet, SheetContent, SheetTrigger, SheetClose,
} from '@/components/ui/sheet';

// ── Sidebar ─────────────────────────────────────────────────────────────────

const NAV_BASE =
  'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-base transition-colors w-full text-left';
const NAV_INACTIVE = 'text-foreground/80 hover:bg-muted hover:text-foreground';
const NAV_ACTIVE = 'bg-primary/10 text-primary font-semibold';

// Sections start collapsed unless the user is currently on a page inside
// the section (auto-expand) or they've toggled it open before (persisted
// in localStorage so the preference sticks across reloads). Bumping the
// key version invalidates any stale preference from earlier defaults.
const COLLAPSED_SECTIONS_KEY = 'gw_sidebar_collapsed_v2';
const DEFAULT_COLLAPSED = ['Admin'] as const;

function loadCollapsed(): Set<string> {
  if (typeof window === 'undefined') return new Set(DEFAULT_COLLAPSED);
  try {
    const raw = window.localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* fall through */ }
  return new Set(DEFAULT_COLLAPSED);
}

function Sidebar() {
  const { settings: branding } = useBrandingSettings();
  // Prefer the short_name for sidebar chrome — most org_names overflow
  // the 256px column. Falls back to org_name then a generic label.
  const tenantName = branding?.short_name || branding?.org_name || 'Your Site';
  const tenantLongName = branding?.org_name || branding?.short_name || 'Your Site';
  const { profile, canEditMusicLibrary } = useUserRole();
  // Defensive: tolerate older useUserRole shapes that don't export this fn
  // (avoids "canEditMusicLibrary is not a function" white-screening the shell).
  const userCanLibrarian = typeof canEditMusicLibrary === 'function'
    ? canEditMusicLibrary()
    : !!(profile?.is_admin || profile?.is_super_admin);
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);

  const toggleSection = (label: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      try {
        window.localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(Array.from(next)));
      } catch { /* ignore */ }
      return next;
    });
  };
  // Switch Site is a platform-owner action — only the super-admin on the
  // "main" tenant can provision/jump between tenants. Demo-admins and other
  // tenant super-admins should not see this control.
  const tenantSlug = (typeof window !== 'undefined' && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || null;
  const isPlatformAdmin = !!profile?.is_super_admin && tenantSlug === 'main';
  // Tenant admin (any tenant) — controls who sees admin-only nav like Modules.
  const isTenantAdmin = !!profile?.is_admin || !!profile?.is_super_admin;

  // Add-on modules — only render the nav entry if the tenant has access.
  const { hasAccess: hasSightReading } = useModuleAccess('sight_reading');
  const { hasAccess: hasTickets } = useModuleAccess('tickets');
  const { hasAccess: hasPartTracks } = useModuleAccess('part_tracks');
  const { hasAccess: hasAuditions } = useModuleAccess('auditions');
  const { hasAccess: hasLibrarian } = useModuleAccess('librarian');
  const { hasAccess: hasPrHub } = useModuleAccess('pr_hub');
  const { hasAccess: hasAlumni } = useModuleAccess('alumni');
  const { hasAccess: hasFinance } = useModuleAccess('finance');
  const { hasAccess: hasMerch } = useModuleAccess('merch');
  const { hasAccess: hasFeeds } = useModuleAccess('feeds');

  // Grouped nav. Sections render their entries under a small uppercase
  // label; sections with zero visible entries are hidden entirely so the
  // sidebar stays tight on tenants that haven't enabled add-ons.
  // `tone` controls the icon-tile background+foreground so each entry
  // carries a small color signal in the column.
  type NavItem = {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    end?: boolean;
    tourId: string;
    tone: string;
    /** Mark the entry as a "hero" — gets the primary-tinted row treatment
     * to stand out among siblings (e.g. Academy as the central LMS surface). */
    hero?: boolean;
  };
  type NavSection = { label: string | null; items: NavItem[] };

  const sections: NavSection[] = [
    {
      label: null,
      items: [
        { to: '/dashboard',              label: 'Command Center', icon: Home,           end: true, tourId: 'nav-command-center', tone: 'bg-primary/10 text-primary' },
        { to: '/dashboard/messenger',    label: 'Messenger',      icon: MessageSquare,             tourId: 'nav-messenger',      tone: 'bg-cyan-50 text-cyan-600' },
        { to: '/dashboard/calendar',     label: 'Calendar',       icon: Calendar,                  tourId: 'nav-calendar',       tone: 'bg-purple-50 text-purple-600' },
        { to: '/dashboard/office-hours', label: 'Office Hours',   icon: CalendarClock,             tourId: 'nav-office-hours',   tone: 'bg-emerald-50 text-emerald-600' },
        { to: '/dashboard/academy',      label: 'Academy',        icon: GraduationCap,             tourId: 'nav-academy',        tone: 'bg-primary text-primary-foreground', hero: true },
      ],
    },
    {
      label: 'Library',
      items: [
        { to: '/dashboard/music-library', label: 'Music Library', icon: Music,  tourId: 'nav-music-library', tone: 'bg-rose-50 text-rose-600' },
        ...(hasPartTracks   ? [{ to: '/dashboard/part-tracks',    label: 'Part Tracks',     icon: Mic,           tourId: 'nav-part-tracks',     tone: 'bg-indigo-50 text-indigo-600' }] : []),
        ...((hasLibrarian && userCanLibrarian) ? [{ to: '/dashboard/librarian',      label: 'Librarian',       icon: LibraryBig,    tourId: 'nav-librarian',       tone: 'bg-slate-50 text-slate-600' }] : []),
        { to: '/dashboard/media-library', label: 'Media Library', icon: Images, tourId: 'nav-media-library', tone: 'bg-orange-50 text-orange-600' },
      ],
    },
    {
      label: 'Add-ons',
      items: [
        ...(hasSightReading ? [{ to: '/dashboard/sight-reading',  label: 'Sight Reading',   icon: Eye,           tourId: 'nav-sight-reading',   tone: 'bg-violet-50 text-violet-600' }] : []),
        ...(hasTickets      ? [{ to: '/dashboard/concert-tickets',label: 'Concert Tickets', icon: Ticket,        tourId: 'nav-concert-tickets', tone: 'bg-pink-50 text-pink-600' }] : []),
        ...(hasAuditions    ? [{ to: '/dashboard/auditions',      label: 'Auditions',       icon: ScanLine,      tourId: 'nav-auditions',       tone: 'bg-lime-50 text-lime-600' }] : []),
        ...(hasPrHub        ? [{ to: '/dashboard/pr-hub',         label: 'PR Hub',          icon: Megaphone,     tourId: 'nav-pr-hub',          tone: 'bg-fuchsia-50 text-fuchsia-600' }] : []),
        ...(hasAlumni       ? [{ to: '/dashboard/alumni',         label: 'Alumni',          icon: GraduationCap, tourId: 'nav-alumni',          tone: 'bg-teal-50 text-teal-600' }] : []),
        ...(hasFinance      ? [{ to: '/dashboard/finance',        label: 'Finance',         icon: DollarSign,    tourId: 'nav-finance',         tone: 'bg-emerald-50 text-emerald-600' }] : []),
        ...(hasMerch        ? [{ to: '/dashboard/shop',           label: 'Store',           icon: ShoppingCart,  tourId: 'nav-shop',            tone: 'bg-amber-50 text-amber-600' }] : []),
        ...(hasFeeds        ? [{ to: '/dashboard/feeds',          label: 'Feeds',           icon: Newspaper,     tourId: 'nav-feeds',           tone: 'bg-blue-50 text-blue-600' }] : []),
      ],
    },
    {
      label: 'Admin',
      items: [
        { to: '/dashboard/users',     label: 'People',    icon: Users,       tourId: 'nav-people',    tone: 'bg-cyan-50 text-cyan-600' },
        { to: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp,  tourId: 'nav-analytics', tone: 'bg-purple-50 text-purple-600' },
        ...(isTenantAdmin ? [{ to: '/settings/modules', label: 'Modules', icon: Boxes, tourId: 'nav-modules', tone: 'bg-primary/10 text-primary' }] : []),
        { to: '/dashboard/workspace', label: 'Settings',  icon: Settings,    tourId: 'nav-settings',  tone: 'bg-muted text-muted-foreground' },
      ],
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-card h-screen sticky top-0">
      {/* Logo / platform name */}
      <Link to="/dashboard" className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
        {branding?.logo_url ? (
          <img
            src={branding.logo_url}
            alt={tenantName}
            className="w-9 h-9 object-contain shrink-0"
          />
        ) : (
          <span
            className="w-9 h-9 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center text-sm font-bold shrink-0"
            aria-hidden
          >
            {(branding?.short_name || tenantName).charAt(0).toUpperCase()}
          </span>
        )}
        <span className="font-bold text-xl tracking-tight truncate">{tenantName}</span>
      </Link>

      {/* Nav — grouped by section. Sections with zero visible items are
          skipped. Labeled sections (Add-ons, Admin) are collapsible; if
          the user is on a route inside a collapsed section, that section
          auto-expands so the active item stays visible. */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-3">
        {sections.map((section, idx) => {
          if (section.items.length === 0) return null;
          const hasActive = section.items.some((it) =>
            it.end ? location.pathname === it.to : location.pathname.startsWith(it.to),
          );
          const isCollapsible = !!section.label;
          const isCollapsed = isCollapsible && collapsed.has(section.label!) && !hasActive;
          return (
            <div key={section.label ?? `section-${idx}`} className="space-y-0.5">
              {section.label && (
                <button
                  type="button"
                  onClick={() => toggleSection(section.label!)}
                  className="w-full flex items-center justify-between px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>{section.label}</span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              {!isCollapsed && section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  data-tour={item.tourId}
                  className={({ isActive }) => {
                    // Hero items get a primary-tinted row + slight font
                    // bump so they read as the central feature regardless
                    // of active state. Active state still wins on emphasis.
                    if (item.hero) {
                      return `${NAV_BASE} ${
                        isActive
                          ? 'bg-primary/15 text-primary font-semibold ring-1 ring-primary/30'
                          : 'bg-primary/5 text-foreground font-semibold hover:bg-primary/10'
                      }`;
                    }
                    return `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`;
                  }}
                >
                  <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${item.tone}`}>
                    <item.icon className="w-4 h-4" />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Tenant pill */}
      <div className="p-3 border-t border-border">
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 inline-flex items-center justify-center text-sm font-bold shrink-0">
              {(branding?.short_name || tenantName).charAt(0).toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold truncate leading-snug">{tenantLongName}</div>
              <div className="text-xs text-muted-foreground">Pro Plan</div>
            </div>
          </div>
          {isPlatformAdmin && (
            <Link
              to="/admin/tenants"
              className="block text-center text-sm text-muted-foreground hover:text-foreground border border-border rounded-md py-1.5 transition-colors"
            >
              Switch Site &rarr;
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── Mobile nav (drawer) ─────────────────────────────────────────────────────
// Lighter clone of the desktop sidebar — same icon-tiled item style but
// without the collapsible-section machinery (mobile users want one flat
// list they can scan). Hides automatically when the user picks a link.

function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  const { settings: branding } = useBrandingSettings();
  const tenantName = branding?.short_name || branding?.org_name || 'Your Site';
  const { profile, canEditMusicLibrary } = useUserRole();
  const isTenantAdmin = !!profile?.is_admin || !!profile?.is_super_admin;
  const userCanLibrarian = canEditMusicLibrary();
  const { hasAccess: hasSightReading } = useModuleAccess('sight_reading');
  const { hasAccess: hasTickets } = useModuleAccess('tickets');
  const { hasAccess: hasPartTracks } = useModuleAccess('part_tracks');
  const { hasAccess: hasAuditions } = useModuleAccess('auditions');
  const { hasAccess: hasLibrarian } = useModuleAccess('librarian');
  const { hasAccess: hasPrHub } = useModuleAccess('pr_hub');
  const { hasAccess: hasAlumni } = useModuleAccess('alumni');
  const { hasAccess: hasFinance } = useModuleAccess('finance');
  const { hasAccess: hasMerch } = useModuleAccess('merch');
  const { hasAccess: hasFeeds } = useModuleAccess('feeds');

  // Group by category to match the desktop sidebar layout. Section labels
  // render above each block so phone/iOS users get the same mental model.
  type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; tone: string };
  const sections: Array<{ label: string; items: Item[] }> = [
    {
      label: 'Home',
      items: [
        { to: '/dashboard',              label: 'Command Center', icon: Home,           tone: 'bg-primary/10 text-primary' },
        { to: '/dashboard/messenger',    label: 'Messenger',      icon: MessageSquare,  tone: 'bg-cyan-50 text-cyan-600' },
        { to: '/dashboard/calendar',     label: 'Calendar',       icon: Calendar,       tone: 'bg-purple-50 text-purple-600' },
        { to: '/dashboard/office-hours', label: 'Office Hours',   icon: CalendarClock,  tone: 'bg-emerald-50 text-emerald-600' },
        { to: '/dashboard/academy',      label: 'Academy',        icon: GraduationCap,  tone: 'bg-primary text-primary-foreground' },
      ],
    },
    {
      label: 'Library',
      items: [
        { to: '/dashboard/music-library',label: 'Music Library',  icon: Music,          tone: 'bg-rose-50 text-rose-600' },
        ...(hasPartTracks ? [{ to: '/dashboard/part-tracks',      label: 'Part Tracks',     icon: Mic,           tone: 'bg-indigo-50 text-indigo-600' }] : []),
        ...((hasLibrarian && userCanLibrarian) ? [{ to: '/dashboard/librarian', label: 'Librarian', icon: LibraryBig, tone: 'bg-slate-50 text-slate-600' }] : []),
        { to: '/dashboard/media-library',label: 'Media Library',  icon: Images,         tone: 'bg-orange-50 text-orange-600' },
      ],
    },
    {
      label: 'Add-ons',
      items: [
        ...(hasSightReading ? [{ to: '/dashboard/sight-reading',  label: 'Sight Reading',   icon: Eye,           tone: 'bg-violet-50 text-violet-600' }] : []),
        ...(hasTickets      ? [{ to: '/dashboard/concert-tickets',label: 'Concert Tickets', icon: Ticket,        tone: 'bg-pink-50 text-pink-600' }] : []),
        ...(hasAuditions    ? [{ to: '/dashboard/auditions',      label: 'Auditions',       icon: ScanLine,      tone: 'bg-lime-50 text-lime-600' }] : []),
        ...(hasPrHub        ? [{ to: '/dashboard/pr-hub',         label: 'PR Hub',          icon: Megaphone,     tone: 'bg-fuchsia-50 text-fuchsia-600' }] : []),
        ...(hasAlumni       ? [{ to: '/dashboard/alumni',         label: 'Alumni',          icon: GraduationCap, tone: 'bg-teal-50 text-teal-600' }] : []),
        ...(hasFinance      ? [{ to: '/dashboard/finance',        label: 'Finance',         icon: DollarSign,    tone: 'bg-emerald-50 text-emerald-600' }] : []),
        ...(hasMerch        ? [{ to: '/dashboard/shop',           label: 'Store',           icon: ShoppingCart,  tone: 'bg-amber-50 text-amber-600' }] : []),
        ...(hasFeeds        ? [{ to: '/dashboard/feeds',          label: 'Feeds',           icon: Newspaper,     tone: 'bg-blue-50 text-blue-600' }] : []),
      ],
    },
    {
      label: 'Workspace',
      items: [
        { to: '/dashboard/users',     label: 'People',    icon: Users,       tone: 'bg-cyan-50 text-cyan-600' },
        { to: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp,  tone: 'bg-purple-50 text-purple-600' },
        ...(isTenantAdmin ? [{ to: '/settings/modules', label: 'Modules', icon: Boxes, tone: 'bg-primary/10 text-primary' }] : []),
        { to: '/dashboard/workspace', label: 'Settings',  icon: Settings,    tone: 'bg-muted text-muted-foreground' },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
        {branding?.logo_url ? (
          <img src={branding.logo_url} alt={tenantName} className="w-9 h-9 object-contain shrink-0" />
        ) : (
          <span className="w-9 h-9 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center text-sm font-bold shrink-0">
            {tenantName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="font-bold text-lg tracking-tight truncate">{tenantName}</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-3">
        {sections.map((section) => (
          section.items.length === 0 ? null : (
            <div key={section.label} className="space-y-0.5">
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {section.label}
              </div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`
                  }
                >
                  <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${item.tone}`}>
                    <item.icon className="w-4 h-4" />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )
        ))}
      </nav>
    </div>
  );
}

// ── Top bar ─────────────────────────────────────────────────────────────────

function TopBar() {
  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { toggleMessenger } = useMessenger();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const displayName = userProfile?.full_name || (user?.user_metadata as any)?.full_name || user?.email || 'Account';
  // Fall through to the OAuth metadata (Google / SSO) when the profile row
  // hasn't been backfilled — the picture lives in auth.users for SSO logins.
  const meta = (user?.user_metadata as any) || {};
  const avatarSrc =
    userProfile?.avatar_url ||
    (userProfile as any)?.headshot_url ||
    meta.avatar_url ||
    meta.picture ||
    undefined;
  const initials = displayName
    .split(/\s+/).map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
  const subRole =
    userProfile?.is_super_admin ? 'Super Admin' :
    userProfile?.is_admin       ? 'Admin' :
    (userProfile?.role || '').charAt(0).toUpperCase() + (userProfile?.role || '').slice(1) || 'Member';

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="h-16 border-b border-border bg-card flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-30">
      {/* Mobile menu (lg:hidden) — drawer with nav. State is controlled so
          a NavLink click can close the sheet without intercepting the
          navigation event. */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <button
            className="lg:hidden w-10 h-10 rounded-full inline-flex items-center justify-center hover:bg-muted transition"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <MobileNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Spacer pushes the cluster to the right */}
      <div className="flex-1" />

      {/* Search — hidden on the smallest viewports to give the action
          cluster room. Users can reach search from the messenger panel. */}
      <form onSubmit={onSearch} className="hidden sm:block w-full max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, events, music, and more..."
            className="w-full h-10 pl-10 pr-3 rounded-full bg-muted/60 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border border-transparent focus:border-border"
          />
        </div>
      </form>

      {/* + button */}
      <button
        onClick={() => toggleMessenger()}
        title="Quick compose"
        className="w-10 h-10 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center hover:brightness-110 transition"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Notification bell — opens messenger panel, shows unread count badge */}
      <button
        onClick={() => toggleMessenger()}
        title="Notifications"
        className="relative w-10 h-10 rounded-full inline-flex items-center justify-center hover:bg-muted transition"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-xs font-semibold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-muted transition">
            <Avatar className="w-9 h-9 border border-border">
              <AvatarImage
                src={avatarSrc}
                alt={displayName}
                className="object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left leading-tight">
              <div className="text-base font-semibold truncate max-w-[160px]">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate max-w-[160px]">{subRole}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" /> Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
      {/* Mounts only when ?tour=admin is in the URL; otherwise a no-op. */}
      <ProductTour />
    </div>
  );
}

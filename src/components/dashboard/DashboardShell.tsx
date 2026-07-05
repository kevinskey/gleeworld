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

import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';

const UserNotificationsSection = lazy(() =>
  import('@/components/notifications/UserNotificationsSection').then(m => ({ default: m.UserNotificationsSection }))
);
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ProductTour } from '@/components/tour/ProductTour';
import {
  Home,
  Calendar,
  GraduationCap,
  MessageSquare,
  Music,
  Eye,
  BookOpen,
  Glasses,
  ScanEye,
  Store,
  Wrench,
  Ticket,
  Mic,
  ScanLine,
  LibraryBig,
  Megaphone,
  Images,
  Boxes,
  ChevronRight,
  ChevronDown,
  ClipboardList,
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
  Heart,
  Disc3,
  Film,
  Route as RouteIcon,
  Sparkles,
  Church,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HIDEABLE_NAV_ROLES, type NavRole } from '@/lib/nav/navCatalog';
import { setPreviewRole, usePreviewRole } from '@/lib/nav/navPreview';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useMessenger } from '@/contexts/MessengerContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { getOrgName } from '@/lib/orgName';
import { useNotifications } from '@/hooks/useNotifications';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useTenantNavPrefs } from '@/hooks/useTenantNavPrefs';
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
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { BecomeTenantDialog } from '@/components/onboarding/BecomeTenantDialog';

/** True when the current subdomain is the public demo. The platform owner
 * uses this to gate the "Become a tenant" CTA — paying tenants shouldn't
 * see an upgrade pitch on their own site. */
function isDemoTenant(): boolean {
  if (typeof window === 'undefined') return false;
  const slug = (window as unknown as { __TENANT_CONFIG__?: { tenant?: string } })
    .__TENANT_CONFIG__?.tenant;
  return slug === 'demo';
}

// ── Sidebar ─────────────────────────────────────────────────────────────────

// Brand glyph — tries the tenant's logo, then the GleeWorld platform
// fallback, then a monogram tile. Tracks `<img>` onError so a broken URL
// never leaves an empty space where the brand should be.
function BrandLogo({
  logoUrl,
  fallbackInitial,
  alt,
  size = 'lg',
}: {
  logoUrl: string | null | undefined;
  fallbackInitial: string;
  alt: string;
  size?: 'md' | 'lg';
}) {
  // No global fallback to the GleeWorld marketing globe — that bled
  // platform branding into every tenant that hadn't uploaded a logo
  // yet. When the tenant has no `logo_url`, OR while branding is
  // still loading, render the colored monogram derived from the
  // tenant's name. The monogram is tenant-neutral and matches the
  // brand color via `bg-primary`.
  const [src, setSrc] = useState<string | null>(logoUrl ?? null);
  useEffect(() => {
    setSrc(logoUrl ?? null);
  }, [logoUrl]);
  const dim = size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${dim} object-contain shrink-0`}
        onError={() => setSrc(null)}
      />
    );
  }
  return (
    <span
      className={`${dim} rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center text-lg font-bold shrink-0`}
      aria-hidden
    >
      {fallbackInitial}
    </span>
  );
}

// 2026 nav type scale — denser, slightly larger touch targets, no tinted
// tile chrome. The colored `tone` value still drives the ICON glyph color
// (a subtle category cue) but no longer paints a background pill behind it.
// Density tier: dense on phones / portrait iPad so the full nav fits
// without an internal scroll, then steps up to text-[14px] on tablets
// and text-[15px] on desktops for comfortable reading. The previous
// flat text-[13px] looked cramped on a 12.9" iPad.
const NAV_BASE =
  'flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] md:text-[14px] lg:text-[15px] leading-tight transition-colors w-full text-left';
// Hover background is 5% brand-gold (--brand-gold is HSL 45 100% 55%).
// arbitrary value syntax keeps the alpha channel without needing a
// dedicated Tailwind color token.
const NAV_INACTIVE = 'text-foreground/85 hover:bg-[hsl(var(--brand-gold)/0.05)] hover:text-foreground';
const NAV_ACTIVE = 'bg-primary/10 text-primary font-semibold';
// `tone` is now {color}-600/700 text-only — strip the legacy bg- portion.
const iconTextOnly = (tone: string) =>
  tone.replace(/bg-\S+/g, '').replace(/\s+/g, ' ').trim() || 'text-foreground/70';

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
  // the 256px column. Falls back to org_name then the platform/tenant
  // bootstrap name (avoids the embarrassing "Your Site" placeholder
  // when branding hasn't loaded yet on first paint or native iOS).
  const fallbackName = getOrgName();
  const tenantName = branding?.short_name || branding?.org_name || fallbackName;
  const tenantLongName = branding?.org_name || branding?.short_name || fallbackName;
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
  const { hasAccess: hasBoxOffice } = useModuleAccess('box_office');
  const { hasAccess: hasPartTracks } = useModuleAccess('part_tracks');
  const { hasAccess: hasAuditions } = useModuleAccess('auditions');
  const { hasAccess: hasLibrarian } = useModuleAccess('librarian');
  const { hasAccess: hasPrHub } = useModuleAccess('pr_hub');
  const { hasAccess: hasAlumni } = useModuleAccess('alumni');
  const { hasAccess: hasFinance } = useModuleAccess('finance');
  const { hasAccess: hasMerch } = useModuleAccess('merch');
  const { hasAccess: hasStore } = useModuleAccess('store');
  const { hasAccess: hasFeeds } = useModuleAccess('feeds');
  const { hasAccess: hasViewer } = useModuleAccess('viewer');
  const { hasAccess: hasConcertPlanner } = useModuleAccess('concert_planner');
  const { hasAccess: hasTourManager } = useModuleAccess('tour');
  const { hasAccess: hasLiturgyPlanner } = useModuleAccess('liturgy_planner');
  const { hasAccess: hasStudio } = useModuleAccess('studio');
  const hiddenNav = useTenantNavPrefs();

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

  // Verb-grouped nav (Today / Music / Teach / Make / Plan / Reach /
  // Money / People / Admin). The sections describe what the user is
  // *doing*, not what kind of object the feature is — so Studio +
  // Video sit together as creation tools, Concert Planner + Tour
  // Manager + Auditions sit together as scheduling tools, and so on.
  // Empty sections (no module access) collapse out of the column.
  const sections: NavSection[] = [
    {
      label: 'Today',
      items: [
        { to: '/dashboard',           label: 'Command Center', icon: Home,          end: true, tourId: 'nav-command-center', tone: 'bg-primary/10 text-primary' },
        { to: '/dashboard/messenger', label: 'Messenger',      icon: MessageSquare,            tourId: 'nav-messenger',      tone: 'bg-cyan-50 text-cyan-600' },
        { to: '/dashboard/calendar',  label: 'Calendar',       icon: Calendar,                 tourId: 'nav-calendar',       tone: 'bg-purple-50 text-purple-600' },
      ],
    },
    {
      label: 'Music',
      items: [
        { to: '/dashboard/music-library', label: 'Music Library', icon: Music, tourId: 'nav-music-library', tone: 'bg-rose-50 text-rose-600' },
        ...(hasViewer ? [{ to: '/dashboard/viewer', label: 'Viewer', icon: ScanEye, tourId: 'nav-viewer', tone: 'bg-amber-50 text-amber-700' }] : []),
        ...(hasSightReading ? [{ to: '/dashboard/sight-reading', label: 'Sight Reading', icon: Eye, tourId: 'nav-sight-reading', tone: 'bg-violet-50 text-violet-600' }] : []),
        ...(hasPartTracks ? [{ to: '/dashboard/part-tracks', label: 'Part Tracks', icon: Mic, tourId: 'nav-part-tracks', tone: 'bg-indigo-50 text-indigo-600' }] : []),
        { to: '/dashboard/media-library', label: 'Media Library', icon: Images, tourId: 'nav-media-library', tone: 'bg-orange-50 text-orange-600' },
        ...((hasLibrarian && userCanLibrarian) ? [{ to: '/dashboard/librarian', label: 'Librarian', icon: LibraryBig, tourId: 'nav-librarian', tone: 'bg-slate-50 text-slate-600' }] : []),
      ],
    },
    {
      label: 'Teach',
      items: [
        { to: '/dashboard/academy',      label: 'Academy',      icon: GraduationCap, tourId: 'nav-academy',      tone: 'bg-primary text-primary-foreground', hero: true },
        { to: '/dashboard/office-hours', label: 'Office Hours', icon: CalendarClock, tourId: 'nav-office-hours', tone: 'bg-emerald-50 text-emerald-600' },
        ...(isTenantAdmin ? [{ to: '/dashboard/practice-recordings', label: 'Practice', icon: Mic, tourId: 'nav-practice', tone: 'bg-teal-50 text-teal-700' }] : []),
      ],
    },
    {
      label: 'Make',
      items: [
        ...(hasStudio ? [{ to: '/studio', label: 'Studio', icon: Disc3, tourId: 'nav-studio', tone: 'bg-sky-50 text-sky-600' }] : []),
        { to: '/video',                 label: 'Video',       icon: Film,   tourId: 'nav-video',       tone: 'bg-pink-50 text-pink-600' },
        { to: '/dashboard/music-tools', label: 'Music Tools', icon: Wrench, tourId: 'nav-music-tools', tone: 'bg-cyan-50 text-cyan-600' },
      ],
    },
    {
      label: 'Plan',
      items: [
        ...(hasConcertPlanner ? [{ to: '/dashboard/concert-planner', label: 'Concert Planner', icon: ClipboardList, tourId: 'nav-concert-planner', tone: 'bg-emerald-50 text-emerald-700' }] : []),
        ...(hasLiturgyPlanner ? [{ to: '/dashboard/liturgy',         label: 'Liturgy Planner', icon: Church,        tourId: 'nav-liturgy-planner', tone: 'bg-amber-50 text-amber-700' }] : []),
        ...(hasTourManager   ? [{ to: '/tour-manager',               label: 'Tour Manager',    icon: RouteIcon,     tourId: 'nav-tour-manager',    tone: 'bg-blue-50 text-blue-600' }] : []),
        ...(hasAuditions     ? [{ to: '/dashboard/auditions',        label: 'Auditions',       icon: ScanLine,      tourId: 'nav-auditions',       tone: 'bg-lime-50 text-lime-600' }] : []),
      ],
    },
    {
      label: 'Reach',
      items: [
        ...(hasPrHub ? [{ to: '/dashboard/pr-hub', label: 'PR Hub', icon: Megaphone, tourId: 'nav-pr-hub', tone: 'bg-fuchsia-50 text-fuchsia-600' }] : []),
        ...(isTenantAdmin ? [{ to: '/admin/fan-page', label: 'Fan Page', icon: Heart, tourId: 'nav-fan-page', tone: 'bg-rose-50 text-rose-700' }] : []),
        ...(hasFeeds ? [{ to: '/dashboard/feeds', label: 'Feeds', icon: Newspaper, tourId: 'nav-feeds', tone: 'bg-blue-50 text-blue-600' }] : []),
        ...(hasMerch || hasStore ? [{ to: '/dashboard/shop',  label: 'Store', icon: Store,     tourId: 'nav-shop',  tone: 'bg-amber-50 text-amber-600' }] : []),
        ...(hasAlumni ? [{ to: '/dashboard/alumni', label: 'Graduates', icon: GraduationCap, tourId: 'nav-alumni', tone: 'bg-teal-50 text-teal-600' }] : []),
      ],
    },
    {
      label: 'Money',
      items: [
        ...(hasBoxOffice && isTenantAdmin ? [{ to: '/dashboard/box-office', label: 'Box Office', icon: Ticket,     tourId: 'nav-box-office', tone: 'bg-rose-50 text-rose-700' }] : []),
        ...(hasFinance                    ? [{ to: '/dashboard/finance',    label: 'Finance',    icon: DollarSign, tourId: 'nav-finance',    tone: 'bg-emerald-50 text-emerald-600' }] : []),
      ],
    },
    {
      label: 'People',
      items: [
        { to: '/dashboard/users', label: 'People', icon: Users, tourId: 'nav-people', tone: 'bg-cyan-50 text-cyan-600' },
      ],
    },
    {
      label: 'Admin',
      items: [
        ...(isTenantAdmin ? [{ to: '/admin/public-page', label: 'Site Setup', icon: Settings, tourId: 'nav-site-setup', tone: 'bg-fuchsia-50 text-fuchsia-700' }] : []),
        { to: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp, tourId: 'nav-analytics', tone: 'bg-purple-50 text-purple-600' },
        { to: '/dashboard/workspace', label: 'Settings',  icon: Settings,   tourId: 'nav-settings',  tone: 'bg-muted text-muted-foreground' },
        // Platform-owner only — provision/manage every tenant. Hidden
        // for tenant super-admins (demo-admin, lincoln-hs admin, etc.)
        // who don't have cross-tenant authority.
        ...(isPlatformAdmin ? [{ to: '/admin/tenants', label: 'Tenants', icon: Sparkles, tourId: 'nav-platform-tenants', tone: 'bg-indigo-50 text-indigo-700' }] : []),
      ],
    },
  ].map((section) => ({
    ...section,
    // Tenant super-admin has an empty set from useTenantNavPrefs, so
    // this is a no-op for them. Lower-role users see their tenant's
    // hidden_items filtered out here.
    items: section.items.filter((it) => !hiddenNav.has(it.to)),
  }));

  // Studio session editor needs the full window for clips + mixer.
  // Hide the sidebar when an open session is loaded. The user can
  // still go back to the session list via the "Sessions" link in the
  // editor's own top bar.
  const inStudioSession = /^\/studio\/sessions\/[^/]+/.test(location.pathname);
  // Viewer reader (score open) takes the full window for the score —
  // the reader has its own back chrome. The landing page (/dashboard/viewer
  // with no scoreId) keeps the sidebar so the user can still see the
  // site brand + nav.
  const inViewerReader = /^\/dashboard\/viewer\/[^/]+/.test(location.pathname);
  if (inStudioSession || inViewerReader) return null;

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 border-r border-border bg-card self-stretch min-h-screen gw-collapsible-sidebar">
      {/* Site brand — tenant logo when set; if the logo image fails to
          load (broken URL / wrong tenant settings), fall back to a
          colored monogram so the brand block never disappears. Larger
          glyph + bigger type so it visibly anchors the page. */}
      <Link to="/dashboard" className="flex items-center gap-3 px-4 h-[80px] border-b border-border">
        <BrandLogo
          logoUrl={branding?.logo_url}
          fallbackInitial={(branding?.short_name || tenantName).charAt(0).toUpperCase()}
          alt={tenantName}
        />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[22px] leading-tight tracking-tight truncate">
            {tenantName}
          </div>
          {branding?.short_name && branding?.org_name && branding.short_name !== branding.org_name && (
            <div className="text-[12px] text-muted-foreground truncate leading-tight mt-0.5">
              {branding.org_name}
            </div>
          )}
        </div>
      </Link>

      {/* Nav — grouped by section. Sections with zero visible items are
          skipped. Labeled sections (Add-ons, Admin) are collapsible; if
          the user is on a route inside a collapsed section, that section
          auto-expands so the active item stays visible. Extra top
          padding (pt-4 sm:pt-5) gives the first item air below the
          brand block instead of glueing flush against the divider. */}
      <nav className="flex-1 overflow-y-auto pt-4 sm:pt-5 pb-2 px-2 space-y-1.5">
        {sections.map((section, idx) => {
          if (section.items.length === 0) return null;
          const isCollapsible = !!section.label;
          // Honor the user's manual collapse intent regardless of which
          // route they're on. The previous `&& !hasActive` override
          // re-expanded any section containing the current route, which
          // made the chevron silently no-op on the section you most
          // wanted to collapse (e.g. clicking "Music" while reading a
          // score in the viewer).
          const isCollapsed = isCollapsible && collapsed.has(section.label!);
          return (
            // Each section is its own card-like surface with a muted
            // background so the long nav reads as grouped sections rather
            // than one giant flat list. Section labels are bigger and
            // higher-contrast to give the eye an anchor.
            <div
              key={section.label ?? `section-${idx}`}
              className={section.label ? 'rounded-lg bg-muted/40 ring-1 ring-border/60 p-1.5 space-y-0.5' : 'space-y-0.5 px-1'}
            >
              {section.label && (
                <button
                  type="button"
                  onClick={() => toggleSection(section.label!)}
                  className="w-full flex items-center justify-between px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/75 hover:text-foreground transition-colors"
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
                  {/* Single tonal icon family — slate-500 default, the
                   * tenant's primary tone only on the hero row.
                   * Replaces the previous 10+ category hues (rose,
                   * amber, violet, indigo, sky, pink…) which violated
                   * the "hero accent only for the main brand identity"
                   * discipline. */}
                  <item.icon className={`w-[18px] h-[18px] shrink-0 ${item.hero ? 'text-primary' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Tenant pill — compact one-row footer. The brand + name are
          already at the top of the sidebar, so we don't repeat the
          logo here. Keeps vertical room for the nav itself. */}
      <div className="px-2 py-1.5 border-t border-border flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className="truncate flex-1">{tenantLongName} · Pro</span>
        {isPlatformAdmin && (
          <Link
            to="/admin/tenants"
            className="shrink-0 px-1.5 py-0.5 rounded border border-border hover:bg-muted hover:text-foreground transition-colors"
          >
            Switch
          </Link>
        )}
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
  const tenantName = branding?.short_name || branding?.org_name || getOrgName();
  const { profile, canEditMusicLibrary } = useUserRole();
  const tenantSlug = (typeof window !== 'undefined' && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || null;
  const isPlatformAdmin = !!profile?.is_super_admin && tenantSlug === 'main';
  const isTenantAdmin = !!profile?.is_admin || !!profile?.is_super_admin;
  const userCanLibrarian = canEditMusicLibrary();
  const { hasAccess: hasSightReading } = useModuleAccess('sight_reading');
  const { hasAccess: hasBoxOffice } = useModuleAccess('box_office');
  const { hasAccess: hasPartTracks } = useModuleAccess('part_tracks');
  const { hasAccess: hasAuditions } = useModuleAccess('auditions');
  const { hasAccess: hasLibrarian } = useModuleAccess('librarian');
  const { hasAccess: hasPrHub } = useModuleAccess('pr_hub');
  const { hasAccess: hasAlumni } = useModuleAccess('alumni');
  const { hasAccess: hasFinance } = useModuleAccess('finance');
  const { hasAccess: hasMerch } = useModuleAccess('merch');
  const { hasAccess: hasStore } = useModuleAccess('store');
  const { hasAccess: hasFeeds } = useModuleAccess('feeds');
  const { hasAccess: hasViewer } = useModuleAccess('viewer');
  const { hasAccess: hasConcertPlanner } = useModuleAccess('concert_planner');
  const { hasAccess: hasTourManager } = useModuleAccess('tour');
  const { hasAccess: hasLiturgyPlanner } = useModuleAccess('liturgy_planner');
  const { hasAccess: hasStudio } = useModuleAccess('studio');
  const hiddenNav = useTenantNavPrefs();

  // Verb-grouped to match the desktop sidebar (Today / Music / Teach /
  // Make / Plan / Reach / Money / People / Admin). Empty sections drop
  // out so a tenant without box-office or finance modules doesn't see
  // an empty "Money" header.
  type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; tone: string };
  const sections: Array<{ label: string; items: Item[] }> = [
    {
      label: 'Today',
      items: [
        { to: '/dashboard',           label: 'Command Center', icon: Home,          tone: 'bg-primary/10 text-primary' },
        { to: '/dashboard/messenger', label: 'Messenger',      icon: MessageSquare, tone: 'bg-cyan-50 text-cyan-600' },
        { to: '/dashboard/calendar',  label: 'Calendar',       icon: Calendar,      tone: 'bg-purple-50 text-purple-600' },
      ],
    },
    {
      label: 'Music',
      items: [
        { to: '/dashboard/music-library', label: 'Music Library', icon: Music, tone: 'bg-rose-50 text-rose-600' },
        ...(hasViewer ? [{ to: '/dashboard/viewer', label: 'Viewer', icon: ScanEye, tone: 'bg-amber-50 text-amber-700' }] : []),
        ...(hasSightReading ? [{ to: '/dashboard/sight-reading', label: 'Sight Reading', icon: Eye, tone: 'bg-violet-50 text-violet-600' }] : []),
        ...(hasPartTracks ? [{ to: '/dashboard/part-tracks', label: 'Part Tracks', icon: Mic, tone: 'bg-indigo-50 text-indigo-600' }] : []),
        { to: '/dashboard/media-library', label: 'Media Library', icon: Images, tone: 'bg-orange-50 text-orange-600' },
        ...((hasLibrarian && userCanLibrarian) ? [{ to: '/dashboard/librarian', label: 'Librarian', icon: LibraryBig, tone: 'bg-slate-50 text-slate-600' }] : []),
      ],
    },
    {
      label: 'Teach',
      items: [
        { to: '/dashboard/academy',      label: 'Academy',      icon: GraduationCap, tone: 'bg-primary text-primary-foreground' },
        { to: '/dashboard/office-hours', label: 'Office Hours', icon: CalendarClock, tone: 'bg-emerald-50 text-emerald-600' },
        ...(isTenantAdmin ? [{ to: '/dashboard/practice-recordings', label: 'Practice', icon: Mic, tone: 'bg-teal-50 text-teal-700' }] : []),
      ],
    },
    {
      label: 'Make',
      items: [
        ...(hasStudio ? [{ to: '/studio', label: 'Studio', icon: Disc3, tone: 'bg-sky-50 text-sky-600' }] : []),
        { to: '/video',                 label: 'Video',       icon: Film,   tone: 'bg-pink-50 text-pink-600' },
        { to: '/dashboard/music-tools', label: 'Music Tools', icon: Wrench, tone: 'bg-cyan-50 text-cyan-600' },
      ],
    },
    {
      label: 'Plan',
      items: [
        ...(hasConcertPlanner ? [{ to: '/dashboard/concert-planner', label: 'Concert Planner', icon: ClipboardList, tone: 'bg-emerald-50 text-emerald-700' }] : []),
        ...(hasLiturgyPlanner ? [{ to: '/dashboard/liturgy',         label: 'Liturgy Planner', icon: Church,        tone: 'bg-amber-50 text-amber-700' }] : []),
        ...(hasTourManager   ? [{ to: '/tour-manager',               label: 'Tour Manager',    icon: RouteIcon,     tone: 'bg-blue-50 text-blue-600' }] : []),
        ...(hasAuditions     ? [{ to: '/dashboard/auditions',        label: 'Auditions',       icon: ScanLine,      tone: 'bg-lime-50 text-lime-600' }] : []),
      ],
    },
    {
      label: 'Reach',
      items: [
        ...(hasPrHub ? [{ to: '/dashboard/pr-hub', label: 'PR Hub', icon: Megaphone, tone: 'bg-fuchsia-50 text-fuchsia-600' }] : []),
        ...(isTenantAdmin ? [{ to: '/admin/fan-page', label: 'Fan Page', icon: Heart, tone: 'bg-rose-50 text-rose-700' }] : []),
        ...(hasFeeds ? [{ to: '/dashboard/feeds', label: 'Feeds', icon: Newspaper, tone: 'bg-blue-50 text-blue-600' }] : []),
        ...(hasMerch || hasStore ? [{ to: '/dashboard/shop',  label: 'Store', icon: Store,     tone: 'bg-amber-50 text-amber-600' }] : []),
        ...(hasAlumni ? [{ to: '/dashboard/alumni', label: 'Graduates', icon: GraduationCap, tone: 'bg-teal-50 text-teal-600' }] : []),
      ],
    },
    {
      label: 'Money',
      items: [
        ...(hasBoxOffice && isTenantAdmin ? [{ to: '/dashboard/box-office', label: 'Box Office', icon: Ticket,     tone: 'bg-rose-50 text-rose-700' }] : []),
        ...(hasFinance                    ? [{ to: '/dashboard/finance',    label: 'Finance',    icon: DollarSign, tone: 'bg-emerald-50 text-emerald-600' }] : []),
      ],
    },
    {
      label: 'People',
      items: [
        { to: '/dashboard/users', label: 'People', icon: Users, tone: 'bg-cyan-50 text-cyan-600' },
      ],
    },
    {
      label: 'Admin',
      items: [
        ...(isTenantAdmin ? [{ to: '/admin/public-page', label: 'Site Setup', icon: Settings, tone: 'bg-fuchsia-50 text-fuchsia-700' }] : []),
        { to: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp, tone: 'bg-purple-50 text-purple-600' },
        { to: '/dashboard/workspace', label: 'Settings',  icon: Settings,   tone: 'bg-muted text-muted-foreground' },
        ...(isPlatformAdmin ? [{ to: '/admin/tenants', label: 'Tenants', icon: Sparkles, tone: 'bg-indigo-50 text-indigo-700' }] : []),
      ],
    },
  ].map((section) => ({
    ...section,
    items: section.items.filter((it) => !hiddenNav.has(it.to)),
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-[80px] border-b border-border">
        <BrandLogo
          logoUrl={branding?.logo_url}
          fallbackInitial={tenantName.charAt(0).toUpperCase()}
          alt={tenantName}
        />
        <span className="font-bold text-[22px] tracking-tight truncate">{tenantName}</span>
      </div>
      <nav className="flex-1 overflow-y-auto pt-2 px-2 space-y-1.5 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        {sections.map((section) => (
          section.items.length === 0 ? null : (
            <div key={section.label} className="rounded-lg bg-muted/40 ring-1 ring-border/60 p-1.5 space-y-0.5">
              <div className="px-2.5 pb-1 pt-1.5 text-[12px] font-semibold tracking-[0.08em] text-muted-foreground/80 uppercase">
                {section.label}
              </div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  onClick={onNavigate}
                  // Mobile drawer text — comfortably bigger than the
                  // desktop sidebar (text-[13px]) without overwhelming
                  // the phone viewport. 17px ≈ iOS standard menu row.
                  // py-2.5 keeps the tap target at 44px (Apple HIG).
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2.5 rounded-md !text-[17px] leading-tight transition-colors w-full text-left ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`
                  }
                >
                  <item.icon className="w-5 h-5 shrink-0 text-slate-500" />
                  <span className="truncate">{item.label}</span>
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

// Views switcher — visible only to tenant super-admins. Lets them
// preview the command-center sidebar as any lower-privilege role
// without signing out. "Home" restores their own super-admin view.
// Backed by the shared navPreview module (sessionStorage-persisted so
// the preview survives a route change but auto-clears on tab close,
// preventing a super-admin from getting trapped with a hidden
// Settings link across sessions).
function ViewsSwitcher() {
  const { user } = useAuth();
  const preview = usePreviewRole();

  // Is this user a tenant super-admin? The nav-prefs write policy
  // uses the same table + column, so the answer here matches the
  // one useTenantNavPrefs computes.
  const { data: isTenantSuperAdmin = false } = useQuery({
    queryKey: ['views-switcher-role', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('gw_tenant_members')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      return (data?.role as string | undefined) === 'super_admin';
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (!isTenantSuperAdmin) return null;

  const label = preview
    ? HIDEABLE_NAV_ROLES.find((r) => r.value === preview)?.label ?? 'Preview'
    : 'Views';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium transition-colors',
            preview
              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300',
          )}
          title={preview ? `Previewing as ${label}` : 'Preview other user views'}
        >
          <Eye className="w-3.5 h-3.5" />
          {label}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Preview command center as</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setPreviewRole(null)}
          className={cn('cursor-pointer', !preview && 'font-semibold')}
        >
          <UserIcon className="mr-2 h-4 w-4" />
          Home (my view)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {HIDEABLE_NAV_ROLES.map((r) => (
          <DropdownMenuItem
            key={r.value}
            onClick={() => setPreviewRole(r.value as NavRole)}
            className={cn('cursor-pointer', preview === r.value && 'font-semibold')}
          >
            <Eye className="mr-2 h-4 w-4" />
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopBar() {
  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { toggleMessenger } = useMessenger();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings: branding } = useBrandingSettings();
  const [query, setQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  // Sidebar is suppressed on immersive full-window routes (Studio
  // session editor, Viewer reader). On those routes the tenant brand
  // block would otherwise disappear entirely, leaving a nameless
  // page header. Show a compact brand + Home link in the topbar's
  // left slot to preserve the tenant identity.
  const inImmersiveRoute =
    /^\/studio\/sessions\/[^/]+/.test(location.pathname) ||
    /^\/dashboard\/viewer\/[^/]+/.test(location.pathname);
  const compactBrandName =
    branding?.short_name || branding?.org_name || getOrgName();

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
  const [becomeTenantOpen, setBecomeTenantOpen] = useState(false);
  const showBecomeTenantCta = isDemoTenant();

  return (
    <header
      className="border-b border-border bg-card flex items-center gap-3 px-4 sm:px-6 sticky top-0 z-30 h-14 md:h-20"
      style={{
        // Height is class-based (h-14 / md:h-20) so phones get a
        // slimmer 56px bar; md+ keeps the 80px that matches the
        // sidebar's brand block (h-[80px]) so the two visually meet at
        // the same baseline instead of the topbar overhanging the
        // brand row. Safe-area inset is ADDED on top of the header
        // height so iOS notches still clear without growing the
        // visible header.
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* Mobile menu (lg:hidden) — drawer with nav. State is controlled so
          a NavLink click can close the sheet without intercepting the
          navigation event. */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <button
            className="md:hidden w-11 h-11 rounded-full inline-flex items-center justify-center hover:bg-muted transition"
            aria-label="Open navigation"
          >
            <Menu className="w-6 h-6" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[85vw] max-w-xs">
          <MobileNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Compact brand block — visible when the sidebar is hidden
          (Studio session editor, Viewer reader) so the topbar still
          shows tenant identity. On non-immersive routes this slot is
          empty and the sidebar carries the brand. Click returns to
          /dashboard. */}
      {inImmersiveRoute && (
        <Link
          to="/dashboard"
          className="hidden md:inline-flex items-center gap-2 shrink-0 pl-1 pr-2 py-1 rounded-md hover:bg-muted transition"
          title={`Back to ${compactBrandName} dashboard`}
        >
          <BrandLogo
            logoUrl={branding?.logo_url}
            fallbackInitial={compactBrandName.charAt(0).toUpperCase()}
            alt={compactBrandName}
          />
          <span className="font-bold text-base tracking-tight truncate max-w-[180px]">
            {compactBrandName}
          </span>
        </Link>
      )}

      {/* Spacer pushes the cluster to the right */}
      <div className="flex-1" />

      {/* Demo-only: "Get your own GleeWorld" CTA pill. Hidden on paying
       * tenants. Opens the concierge intake form (BecomeTenantDialog).
       * Uniform sizing across all breakpoints — earlier sm:h-10 + label
       * reveal made the pill jump sizes and the text wrap on narrow
       * widths. `!text-white` overrides the global `button { color }`
       * reset from index.css that otherwise rendered the label black.
       * `whitespace-nowrap` keeps "Get your own" on one line. */}
      {showBecomeTenantCta && (
        <button
          onClick={() => setBecomeTenantOpen(true)}
          title="Get your own GleeWorld site"
          aria-label="Get your own GleeWorld site"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm shrink-0 hover:scale-[1.02] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
            // Inline color wins against every global `button { color }`
            // override in index.css (radix menu, body foreground, etc.)
            // without needing layering tricks.
            color: '#ffffff',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
          <span className="hidden sm:inline" style={{ color: '#ffffff' }}>Get your own</span>
        </button>
      )}

      {/* Search — full input on sm+, icon-trigger on phones. Earlier the
          input was simply `hidden sm:block`, which left mobile users with
          no path to search at all. The mobile button opens a focused
          search prompt (browser-native via <dialog>-style fallback). */}
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
      <button
        onClick={() => {
          const q = window.prompt('Search students, events, music, and more…')?.trim();
          if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
        }}
        title="Search"
        className="sm:hidden w-11 h-11 rounded-full inline-flex items-center justify-center hover:bg-muted transition"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* + button */}
      <button
        onClick={() => toggleMessenger()}
        title="Quick compose"
        aria-label="Quick compose"
        className="w-11 h-11 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center hover:brightness-110 transition"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Views switcher — tenant super-admins only */}
      <ViewsSwitcher />

      {/* Notification bell — opens the personal notifications inbox
          (matches the unread badge, which counts gw_notifications).
          /notifications is the ADMIN send tool, not an inbox — don't
          link the bell there. Composing lives on the + button. */}
      <button
        onClick={() => setNotifOpen(true)}
        title="Notifications"
        aria-label="Notifications"
        className="relative w-11 h-11 rounded-full inline-flex items-center justify-center hover:bg-muted transition"
      >
        <Bell className="w-6 h-6 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] leading-none font-semibold rounded-full min-w-[22px] h-[18px] inline-flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Personal notifications inbox — slide-in panel */}
      <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading notifications…</div>}>
            {notifOpen && <UserNotificationsSection />}
          </Suspense>
        </SheetContent>
      </Sheet>

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

      {/* Concierge intake — only mounted/shown when triggered from the
       * topbar pill. Self-portals to body so no layout impact when closed. */}
      {showBecomeTenantCta && (
        <BecomeTenantDialog
          open={becomeTenantOpen}
          onClose={() => setBecomeTenantOpen(false)}
        />
      )}
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
        {/* pt-3 gives every page a small breath of space below the
            sticky topbar — pages that want more (CommandCenter, Viewer
            landing) add their own larger top padding on top of this.
            pb-20 sm:pb-0 reserves room for the MobileBottomNav strip
            (only rendered on phones; sm+ has no bottom nav). */}
        <main className="flex-1 min-w-0 overflow-x-hidden pt-3 sm:pt-4 pb-20 sm:pb-0">{children}</main>
      </div>
      {/* Phone-only persistent bottom nav. Self-gates via useIsPhone()
          so it returns null on tablet/desktop — safe to mount globally. */}
      <MobileBottomNav />
      {/* Mounts only when ?tour=admin is in the URL; otherwise a no-op. */}
      <ProductTour />
    </div>
  );
}

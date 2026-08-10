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

import { createContext, lazy, Suspense, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// Idempotence guard. Some pages self-wrap in <DashboardShell> while their
// route in App.tsx already wraps them — nested instances would render two
// sidebars + two topbars. Nested instances short-circuit to a pass-through.
const DashboardShellNestedContext = createContext(false);

const UserNotificationsSection = lazy(() =>
  import('@/components/notifications/UserNotificationsSection').then(m => ({ default: m.UserNotificationsSection }))
);
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ProductTour } from '@/components/tour/ProductTour';
import {
  Eye,
  BookOpen,
  Glasses,
  Boxes,
  ChevronDown,
  ShoppingCart,
  Settings,
  Search,
  Plus,
  Bell,
  LogOut,
  Menu,
  User as UserIcon,
  Building2,
  Check,
  Sparkles,
  PanelLeft,
  PanelLeftClose,
  Bug,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { HIDEABLE_NAV_ROLES, applyPreviewRole, type NavRole } from '@/lib/navigation/navCatalog';
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
import { useEffectivePreviewRole, useMyTenantRole } from '@/hooks/useEffectivePreviewRole';
import { isTenantSuperAdminRole } from '@/lib/auth/tenantRoles';
import { useMyTenants, tenantHomeUrl, tenantSwitchUrl, performTenantSwitch } from '@/hooks/useMyTenants';
import { isNativeApp } from '@/lib/nativeTenant';
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
import { RequestWorkspaceDialog } from '@/components/leads/RequestWorkspaceDialog';
import { ReportBugDialog } from '@/components/feedback/ReportBugDialog';
import { isDemoTenant } from '@/lib/demoTenant';
import { AssistantProvider } from '@/lib/assistant/AssistantProvider';
import { AssistantFab } from '@/components/assistant/AssistantFab';
import { AssistantMiniPlayer } from '@/components/assistant/AssistantMiniPlayer';
import { AssistantSheet } from '@/components/assistant/AssistantSheet';
import { TrialBanner } from '@/components/dashboard/TrialBanner';
import { PermissionSlipBell } from '@/components/dashboard/PermissionSlipBell';
import {
  resolveNav,
  type CatalogEntry, type NavContext,
} from '@/lib/navigation/navCatalog';
import { NavShelf } from './NavShelf';
import { AllToolsSheet } from './AllToolsSheet';
import { isFacultyProfile } from '@/lib/roles';
import { useMyTools } from '@/hooks/useMyTools';
import { selectShelfEntries, ROLE_INVARIANT_CORE_TOOLS, resolvedTools } from '@/lib/navigation/myTools';

// The fixed module-gate key list a `module: 'x'` catalog gate checks
// against. One definition shared by Sidebar, MobileNav, and the All Tools
// sheet's own catalog hook below, so the three call sites can't drift out
// of sync with which modules exist. (Cost us All-State on first deploy,
// once, when a gated nav entry was added without adding its key here.)
const MODULE_KEYS = ['sight_reading', 'box_office', 'auditions', 'librarian', 'pr_hub', 'alumni', 'finance', 'merch', 'store', 'feeds', 'viewer', 'concert_planner', 'tour', 'liturgy_planner', 'studio', 'songwriting', 'planner', 'all_state'] as const;

// The platform ('main') tenant ships no branding.logo_url of its own, so
// BrandLogo fell back to the monogram there. Use the GleeWorld platform logo
// for main; every other tenant keeps its own logo (or monogram) so no platform
// branding bleeds into tenants. Same asset the public marketing header uses.
const GLEE_PLATFORM_LOGO = '/lovable-uploads/gleeworld-logo.png?v=6';
function platformLogoFor(brandingLogoUrl?: string | null): string | undefined {
  if (brandingLogoUrl) return brandingLogoUrl;
  // getTenantSlug() falls back to 'main' when no tenant bootstrap exists —
  // which is exactly the gleeworld.org apex, where this fallback matters.
  return getTenantSlug() === 'main' ? GLEE_PLATFORM_LOGO : undefined;
}

// The gated nav shared by Sidebar, MobileNav, and the All Tools sheet's own
// catalog hook below. Originally landed as three independent copies (one
// per call site) on the theory that DashboardShell.shelf.test.tsx — which
// renders Sidebar/MobileNav standalone against mocked hooks — required it.
// That was wrong: `vi.mock` is module-level, so which function calls the
// mocked hooks underneath is irrelevant, and a review round proved it by
// running that test file plus DashboardShell.allTools.test.tsx and
// NavShelf.test.tsx unchanged against this extraction — 20/20 green. One
// definition now, used by all three, so gating can never disagree between
// what the shelf shows and what the sheet offers.
//
// Also folds in a real divergence the three-copy version had let through:
// MobileNav used to call `canEditMusicLibrary()` bare while Sidebar and the
// sheet's hook guarded it with `typeof === 'function'` (tolerating an older
// useUserRole shape that doesn't export the fn, so a stale bundle can't
// white-screen the shell) — this hook always uses the defensive form.
function useGatedNav() {
  const { profile, loading: roleLoading, canEditMusicLibrary } = useUserRole();
  const userCanLibrarian = typeof canEditMusicLibrary === 'function'
    ? canEditMusicLibrary()
    : !!(profile?.is_admin || profile?.is_super_admin);
  const tenantSlug = (typeof window !== 'undefined' && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || null;
  const isPlatformAdmin = !!profile?.is_super_admin && tenantSlug === 'main';
  const isTenantAdmin = !!profile?.is_admin || !!profile?.is_super_admin;

  // Add-on modules — only render the nav entry if the tenant has access.
  // A catalog entry gated on `module: 'x'` renders ONLY if 'x' appears here —
  // hasModule() below reads this map, not the full tenant module set. Adding a
  // gated nav entry without adding its key here silently hides it, with no
  // error anywhere. (Cost us All-State on first deploy.)
  // Hooks must run unconditionally and in stable order — a fixed key list keeps that true.
  const moduleAccess: Record<string, boolean> = {};
  for (const key of MODULE_KEYS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed-length loop over a const array; call order is stable across renders
    moduleAccess[key] = useModuleAccess(key).hasAccess;
  }
  const hiddenNav = useTenantNavPrefs();
  const previewRole = useEffectivePreviewRole();

  // applyPreviewRole narrows the capability flags when a super-admin is
  // previewing — without it the gates read the real profile and admin-only
  // entries (Users, Settings, Tenants) leak into every previewed role.
  const navCtx: NavContext = applyPreviewRole({
    hasModule: (k) => k === 'academy' || !!moduleAccess[k], // academy is core (mirrors toModuleSet); no catalog entry gates on it today
    isTenantAdmin, isPlatformAdmin, canLibrarian: userCanLibrarian,
    isPartner: !!profile?.is_partner,
    hiddenRoutes: hiddenNav,
  }, previewRole);
  // isFacultyProfile is the single definition (src/lib/roles.ts) — an inline
  // admin||super||instructor check here missed teacher/conductor/director, so a
  // director got the faculty grid on HouseHome and the STUDENT shelf here.
  const isFaculty = isFacultyProfile(profile);
  const { myTools, loaded: myToolsLoaded, pinTool } = useMyTools(isFaculty ? 'faculty' : 'student');
  // The full gated set from resolveNav — not filtered to sidebar-surface
  // entries. The All Tools sheet is the full catalog now (Phase 3), and a
  // member migrating from home_tile_layout can legitimately have grid-only
  // keys (merch, tickets, attendance) in their My Tools set; resolveNav's
  // unfiltered output keeps those reachable everywhere this is used.
  const resolvedEntries = resolveNav(navCtx);
  // 'home' has no gate, but hiddenRoutes could still remove it (Workspace
  // Settings → Navigation). Callers treat a missing homeEntry as "no Home
  // row" rather than blanking the whole nav.
  const homeEntry = resolvedEntries.find((e) => e.key === 'home');

  return { resolvedEntries, homeEntry, myTools, myToolsLoaded, pinTool, roleLoading, isPlatformAdmin };
}

// The stored My Tools record + gated catalog behind the All Tools sheet.
//
// `pinned` is the UNFILTERED stored set — never `resolveNav`'s gated output —
// and it is used for DISPLAY ONLY (which rows read "In your world"). It IS
// resolved through MERGED_KEYS (via resolvedTools):
// without that, a stored retired key (e.g. 'merch') would fail to match its
// living catalog entry's key ('shop') in AllToolsSheet's `pinnedSet.has(...)`
// check, and the sheet would offer Store Admin as "not yet in your space"
// when the member already effectively has it (Phase 5 review, 2026-08-09).
// The APPEND itself is not computed here at all: `onPin` is useMyTools'
// pinTool, which reads the freshest record out of the query cache at call
// time and refuses unless the row genuinely loaded. Computing the append
// from this render-time `pinned` is precisely the bug that persisted a
// one-key record over a member's eight tools and their widgets whenever the
// sheet was opened before the query resolved — and the same snapshot that
// dropped the first of two pins fired in one tick.
function useAllToolsCatalog(): {
  available: CatalogEntry[];
  pinned: string[];
  canPin: boolean;
  onPin: (key: string) => Promise<boolean>;
} {
  const { resolvedEntries, myTools, myToolsLoaded, pinTool } = useGatedNav();
  return {
    available: resolvedEntries,
    pinned: resolvedTools(myTools),
    // No record, no ⊕: pinTool would refuse, and offering an action that
    // can only fail is the "tap does nothing" shape the plan forbids.
    canPin: myToolsLoaded,
    onPin: pinTool,
  };
}

// ── Sidebar ─────────────────────────────────────────────────────────────────

// Brand glyph — tries the tenant's logo, then the GleeWorld platform
// fallback, then a monogram tile. Tracks `<img>` onError so a broken URL
// never leaves an empty space where the brand should be.
//
// Exported for its own test: the size logic (a banner logo must be wide, not
// boxed square) is the whole point of the open-nav brand block, and testing
// it through the full shell would mean standing up routing, auth and branding
// providers to assert one className.
export function BrandLogo({
  logoUrl,
  fallbackInitial,
  alt,
  size = 'lg',
}: {
  logoUrl: string | null | undefined;
  fallbackInitial: string;
  alt: string;
  size?: 'md' | 'lg' | 'xl' | 'banner';
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
  // xl is the desktop left-nav brand: w-12 (48px) grown ~40% → 67px.
  //
  // `banner` is the open left-nav: the logo stands alone with no site name
  // beside it, so it gets the full width and grows to fill it. Crucially it
  // is NOT square — most parish and school marks are wide horizontal lockups
  // (a device plus two lines of type), and forcing one into a 67px box
  // letterboxes it down to an illegible stamp. Height is capped so a tall
  // or square logo cannot push the nav's first item off the screen.
  const dim = size === 'banner'
    ? 'w-full h-auto max-h-[76px]'
    : size === 'xl' ? 'w-[67px] h-[67px]' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${dim} object-contain ${size === 'banner' ? 'object-left' : 'shrink-0'}`}
        onError={() => setSrc(null)}
      />
    );
  }
  return (
    <span
      className={`${size === 'banner' ? 'w-[67px] h-[67px]' : dim} rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center text-lg font-bold shrink-0`}
      aria-hidden
    >
      {fallbackInitial}
    </span>
  );
}

// `tone` is now {color}-600/700 text-only — strip the legacy bg- portion.
const iconTextOnly = (tone: string) =>
  tone.replace(/bg-\S+/g, '').replace(/\s+/g, ' ').trim() || 'text-foreground/70';

// Exported for its own test (I2 regression guard): asserting that a
// missing/hidden Home entry degrades the shelf rather than blanking the
// whole sidebar means rendering Sidebar with mocked hooks, same rationale
// as BrandLogo's export above — standing up the full DashboardShell (auth,
// routing, branding, tenant prefs, module access, ×2 for MobileNav) to
// reach one `if (!homeEntry) return null` guard would be disproportionate.
// onOpenAllTools is required — NavShelf's own prop is required, and this
// task deliberately doesn't weaken that at the Sidebar boundary. The six
// call sites in DashboardShell.shelf.test.tsx that used to render
// <Sidebar /> without it now pass a `vi.fn()`.
export function Sidebar({ onCollapse, onOpenAllTools }: { onCollapse?: () => void; onOpenAllTools: () => void }) {
  const { settings: branding } = useBrandingSettings();
  // Prefer the short_name for sidebar chrome — most org_names overflow
  // the 256px column. Falls back to org_name then the platform/tenant
  // bootstrap name (avoids the embarrassing "Your Site" placeholder
  // when branding hasn't loaded yet on first paint or native iOS).
  const fallbackName = getOrgName();
  const tenantName = branding?.short_name || branding?.org_name || fallbackName;
  const tenantLongName = branding?.org_name || branding?.short_name || fallbackName;
  const location = useLocation();
  const { resolvedEntries, homeEntry, myTools, roleLoading, isPlatformAdmin } = useGatedNav();
  // isFaculty is a guess (profile is still null) until roleLoading clears —
  // useUserRole(null) reads as student, so a faculty member could flash
  // DEFAULT_TOOLS_STUDENT before their real shelf swaps in. But
  // DashboardShell mounts fresh on every route (111 usages in App.tsx,
  // not a persistent layout), and useUserRole caches nothing — roleLoading
  // is true on literally every navigation, not just first load. Blanking
  // the shelf every time (`roleLoading ? [] : ...`) traded one bug for a
  // worse one: a member whose tools were already known instantly would
  // watch the shelf empty out and refill on every click.
  //
  // `role` only changes what myTools.tools resolves to in ONE branch of
  // migrateToMyTools — the role-default fallback for a member with NO
  // stored record at all (myTools.ts). Anyone with a real record
  // (setupComplete: true) gets the SAME tools back regardless of which
  // role guess fetched them, because the query reads by uid, not by role.
  // So: once we have a confirmed record, show it immediately — roleLoading
  // is irrelevant. Only while genuinely guessing (no confirmed record yet)
  // do we hide the role-specific guess, and even then we don't blank: we
  // show the tools both role defaults agree on (ROLE_INVARIANT_CORE_TOOLS),
  // which can never be wrong for either role. This is the MobileBottomNav
  // convention actually applied correctly — CORE_TAB_KEYS there is the
  // role-invariant set, not an empty one.
  const knownGood = myTools?.setupComplete === true;
  const shelfTools = (roleLoading && !knownGood)
    ? selectShelfEntries(resolvedEntries, ROLE_INVARIANT_CORE_TOOLS)
    : selectShelfEntries(resolvedEntries, myTools?.tools ?? []);

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

  // Whether there is a real logo to stand on its own, as opposed to the
  // monogram BrandLogo falls back to.
  const hasLogo = !!platformLogoFor(branding?.logo_url);

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 bg-card self-stretch min-h-[100dvh] gw-collapsible-sidebar">
      {/* Site brand — tenant logo when set; if the logo image fails to
          load (broken URL / wrong tenant settings), fall back to a
          colored monogram so the brand block never disappears. Larger
          glyph + bigger type so it visibly anchors the page. */}
      <div
        className="flex items-center border-b border-border pr-2 pt-[env(safe-area-inset-top,0px)] h-[calc(92px+env(safe-area-inset-top,0px))]"
      >
        {/* Open nav: the LOGO alone, at full width (Kevin). A logo beside a
            site name has to share ~150px with it, which squeezed a wide
            lockup down to a stamp and still truncated the name to "The L…".
            Standing alone it can be read. The name is not lost — it is what
            the collapsed-nav header shows instead, where there is no logo
            competing for the room.

            A tenant with NO logo keeps the name: dropping it there would
            leave a single monogram letter identifying the workspace. */}
        <Link to="/dashboard" className="flex min-w-0 flex-1 items-center gap-3 px-4 h-full">
          <BrandLogo
            logoUrl={platformLogoFor(branding?.logo_url)}
            fallbackInitial={(branding?.short_name || tenantName).charAt(0).toUpperCase()}
            alt={tenantName}
            size={hasLogo ? 'banner' : 'xl'}
          />
          {!hasLogo && (
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
          )}
        </Link>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Hide navigation"
            title="Hide navigation"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav — Home + the member's My Tools shelf (My World, Phase 1), with
          every remaining destination reachable through the All Tools sheet
          (Phase 3) rather than an in-shelf disclosure. No collapsible
          sections, no drag reorder here — arranging the shelf is a
          deliberate action on /dashboard/my-world, not a gesture performed
          on the live nav.

          `flex-1 min-h-0 overflow-y-auto` is load-bearing now that the shelf
          has no length cap. The `min-h-0` is NOT decorative: a flex item
          defaults to `min-height: auto`, which refuses to shrink below its
          content, so `flex-1 overflow-y-auto` alone does not scroll — the
          nav would grow past the aside, and the `overflow-hidden` on the
          shell's outer flex row would then CLIP the tenant pill and the tail
          of the shelf, leaving those rows unreachable. That was invisible
          while the shelf was capped at 8 (max 11 rows always fit); it is
          reachable now that a member may keep as many tools as they like.
          The main column beside this one already pairs the same three
          classes for the same reason. Extra top padding (pt-4 sm:pt-5) gives
          the first item air below the brand block instead of glueing flush
          against the divider. */}
      <nav className="flex-1 min-h-0 overflow-y-auto pt-4 sm:pt-5 pb-2 px-2">
        <NavShelf
          home={homeEntry}
          tools={shelfTools}
          onOpenAllTools={onOpenAllTools}
          variant="desktop"
        />
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
// Same NavShelf as the desktop sidebar — Home + the member's My Tools set,
// with everything else behind All Tools. Hides automatically when the user
// picks a link (onNavigate closes the Sheet).
//
// Exported for its own test — same rationale as Sidebar above. onOpenAllTools
// is required for the same reason it is on Sidebar — see that comment.
export function MobileNav({ onNavigate, onOpenAllTools }: { onNavigate: () => void; onOpenAllTools: () => void }) {
  const { settings: branding } = useBrandingSettings();
  const tenantName = branding?.short_name || branding?.org_name || getOrgName();
  const { resolvedEntries, homeEntry, myTools, roleLoading } = useGatedNav();
  // Same knownGood/roleLoading gate as Sidebar — see the matching comment
  // there for why this isn't `roleLoading ? [] : ...` anymore.
  const knownGood = myTools?.setupComplete === true;
  const shelfTools = (roleLoading && !knownGood)
    ? selectShelfEntries(resolvedEntries, ROLE_INVARIANT_CORE_TOOLS)
    : selectShelfEntries(resolvedEntries, myTools?.tools ?? []);

  return (
    <div className="flex flex-col h-full">
      {/* min-height includes the status-bar inset (same border-box rule
          as the TopBar): a fixed h-[80px] + safe-area padding would
          collapse and push the brand under the iOS clock. */}
      <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top,0px)] min-h-[calc(80px+env(safe-area-inset-top,0px))] border-b border-border">
        <BrandLogo
          logoUrl={platformLogoFor(branding?.logo_url)}
          fallbackInitial={tenantName.charAt(0).toUpperCase()}
          alt={tenantName}
        />
        <span className="font-bold text-[22px] tracking-tight truncate">{tenantName}</span>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto pt-2 px-2 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        <NavShelf
          home={homeEntry}
          tools={shelfTools}
          // Close the drawer FIRST: the sheet is a modal dialog over the
          // page, and leaving the drawer mounted underneath it means that
          // picking the route you are already on (no shell remount, so no
          // incidental reset) drops you back onto an open drawer.
          onOpenAllTools={() => { onNavigate(); onOpenAllTools(); }}
          variant="mobile"
          onNavigate={onNavigate}
        />
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

  // Is this user a tenant super-admin *of the tenant they're looking at*?
  // Shares useMyTenantRole with useTenantNavPrefs rather than repeating the
  // query — the duplicate copy here carried its own tenant-unscoped
  // .maybeSingle(), which returned null for any multi-tenant user and hid
  // the control from them.
  const myTenantRole = useMyTenantRole();

  if (!isTenantSuperAdminRole(myTenantRole)) return null;

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

function TopBar({ navCollapsed = false, onExpandNav, onOpenAllTools }: { navCollapsed?: boolean; onExpandNav?: () => void; onOpenAllTools: () => void }) {
  const { user, signOut } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { toggleMessenger } = useMessenger();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings: branding } = useBrandingSettings();
  const [query, setQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  // "Switch organization" — every tenant this user belongs to. Only surfaced
  // when there's more than one, so single-tenant members stay in their world.
  const { data: myTenants = [] } = useMyTenants();
  const currentTenantSlug =
    (typeof window !== 'undefined' && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || null;

  // Sidebar is suppressed on immersive full-window routes (Studio
  // session editor, Viewer reader). On those routes the tenant brand
  // block would otherwise disappear entirely, leaving a nameless
  // page header. Show a compact brand + Home link in the topbar's
  // left slot to preserve the tenant identity.
  const inImmersiveRoute =
    /^\/studio\/sessions\/[^/]+/.test(location.pathname) ||
    /^\/dashboard\/viewer\/[^/]+/.test(location.pathname);
  // The brand block also moves up here when the user collapses the nav.
  const sidebarHidden = inImmersiveRoute || navCollapsed;
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
  const [reportBugOpen, setReportBugOpen] = useState(false);
  const showBecomeTenantCta = isDemoTenant();

  // min-height INCLUDES the safe-area inset: with border-box, a fixed
  // h-14 + padding-top collapses the content region and the icons spill
  // 40+px below the bar (the header/toolbar overlap on notched iPhones).
  // Visible bar stays 56px (md: 80px, matching the sidebar's h-[80px]
  // brand block); the inset grows the box above it. bg-background/80 +
  // blur instead of opaque bg-card so the bar reads as the page surface
  // continuing under the iOS clock rather than a white strip over the
  // gray page.
  return (
    <header
      className="border-b border-border/60 bg-card flex items-center gap-3 px-4 sm:px-6 sticky z-30 min-h-[calc(3.5rem+env(safe-area-inset-top,0px))] md:min-h-[calc(5rem+env(safe-area-inset-top,0px))]"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        top: 'var(--gw-demo-bar-h, 0px)',
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
          <MobileNav onNavigate={() => setMobileNavOpen(false)} onOpenAllTools={onOpenAllTools} />
        </SheetContent>
      </Sheet>

      {/* Compact brand block — visible when the sidebar is hidden
          (Studio session editor, Viewer reader) so the topbar still
          shows tenant identity. On non-immersive routes this slot is
          empty and the sidebar carries the brand. Click returns to
          /dashboard. */}
      {navCollapsed && (
        <button
          type="button"
          onClick={onExpandNav}
          className="hidden md:inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-full hover:bg-muted transition"
          aria-label="Show navigation"
          title="Show navigation"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      )}
      {sidebarHidden && (
        <Link
          to="/dashboard"
          className="hidden md:inline-flex items-center gap-2 shrink-0 pl-1 pr-2 py-1 rounded-md hover:bg-muted transition"
          title={`Back to ${compactBrandName} dashboard`}
        >
          <BrandLogo
            logoUrl={platformLogoFor(branding?.logo_url)}
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

      {/* Demo-only: "Request your workspace" CTA pill. Hidden on paying
       * tenants. Opens the concierge intake form (RequestWorkspaceDialog).
       * Uniform sizing across all breakpoints — earlier sm:h-10 + label
       * reveal made the pill jump sizes and the text wrap on narrow
       * widths. `!text-white` overrides the global `button { color }`
       * reset from index.css that otherwise rendered the label black.
       * `whitespace-nowrap` keeps the label on one line. */}
      {showBecomeTenantCta && (
        <button
          onClick={() => setBecomeTenantOpen(true)}
          title="Request your workspace"
          aria-label="Request your workspace"
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
          <span className="hidden sm:inline" style={{ color: '#ffffff' }}>Request your workspace</span>
        </button>
      )}

      {/* Search — full input on sm+, icon-trigger on phones. Earlier the
          input was simply `hidden sm:block`, which left mobile users with
          no path to search at all. The mobile button opens a focused
          search prompt (browser-native via <dialog>-style fallback). */}
      <form onSubmit={onSearch} className="hidden sm:block w-full max-w-md min-w-0">
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

      {/* Permission-slip signed bell — tour managers only; RLS scopes
          the query so non-managers see 0 rows and the bell stays hidden. */}
      <PermissionSlipBell />

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
            <Avatar className="w-14 h-14 border border-border">
              <AvatarImage
                src={avatarSrc}
                alt={displayName}
                className="object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-base font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* lg+, not md+ — at 768-1023 (iPad portrait) the sidebar +
                search + action buttons already fill the row; this 176px
                text block was the piece that pushed the bell/avatar into
                the shell's overflow-hidden crop. */}
            <div className="hidden lg:block text-left leading-tight">
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
          <DropdownMenuItem onClick={() => setReportBugOpen(true)} className="flex items-center gap-2">
            <Bug className="w-4 h-4" /> Report a Bug
          </DropdownMenuItem>
          {/* Switch organization — every tenant this user belongs to.
              On web, navigation crosses subdomains (full-page load into
              the target tenant's own domain). On native (iOS), cross-
              subdomain navigation would bounce out of the WKWebView, so
              we rewrite the cached tenant + reload in place — same
              mechanism NativeTenantGate uses on first login. Shown
              whenever the user has 2+ memberships (single-tenant users
              stay in their world). */}
          {myTenants.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Switch organization
              </DropdownMenuLabel>
              {myTenants.map((t) => {
                const isCurrent = t.slug === currentTenantSlug;
                const onSwitch = async () => {
                  if (isCurrent) return;
                  if (isNativeApp()) {
                    // In-place tenant swap: update the cached brand +
                    // reload. main gets a minimal payload (no branding
                    // fetch — it's the platform shell); real tenants
                    // carry their org name too so the sidebar picks it
                    // up on first paint after reload.
                    try {
                      const payload = t.slug === 'main'
                        ? { tenant: 'main' }
                        : { tenant: t.slug, org: t.name ?? undefined };
                      localStorage.setItem('gw_native_tenant', JSON.stringify(payload));
                    } catch { /* private mode — reload will fall back to picker */ }
                    window.location.reload();
                    return;
                  }
                  // Web: pivot the JWT via set_active_tenant (writes
                  // active_tenant_id, NOT tenant_id — home tenant is
                  // preserved), refresh the session so the new JWT
                  // carries the target tenant_slug, then transfer
                  // through /auth/callback so the destination lands
                  // signed-in with a correctly-scoped session. On
                  // failure fall back to plain nav so the user still
                  // reaches the target's login screen.
                  try {
                    const refreshed = await performTenantSwitch(supabase, t.slug);
                    window.location.href = tenantSwitchUrl(t.slug, refreshed);
                  } catch (e) {
                    console.warn('[tenant-switch] pivot failed, falling back to login', e);
                    window.location.href = tenantHomeUrl(t.slug);
                  }
                };
                return (
                  <DropdownMenuItem
                    key={t.tenant_id}
                    disabled={isCurrent}
                    onClick={onSwitch}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    {/* Label override for main: gw_tenants.name for the
                        main tenant is "GW Preview" (leftover seed data)
                        which reads as an internal debug string. Show
                        the platform name so the switcher reads as a
                        real destination. Non-main tenants use their
                        actual name. */}
                    <span className="flex-1 truncate">
                      {t.slug === 'main' ? 'GleeWorld' : (t.name || t.slug)}
                    </span>
                    {isCurrent && <Check className="w-4 h-4 shrink-0 text-muted-foreground" />}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Concierge intake — only mounted/shown when triggered from the
       * topbar pill. Self-portals to body so no layout impact when closed. */}
      {showBecomeTenantCta && (
        <RequestWorkspaceDialog
          open={becomeTenantOpen}
          onClose={() => setBecomeTenantOpen(false)}
        />
      )}
      <ReportBugDialog open={reportBugOpen} onClose={() => setReportBugOpen(false)} />
    </header>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────

export function DashboardShell({ children }: { children: ReactNode }) {
  const alreadyInsideShell = useContext(DashboardShellNestedContext);
  // Calendar keeps its compact header spacing but shows the nav like every
  // other app — anyone who needs the width can collapse the nav instead.
  const { pathname } = useLocation();
  const isCalendar = pathname.startsWith('/dashboard/calendar');
  // User-controlled nav collapse (persisted). Collapsing frees the full
  // window width for work surfaces like Calendar and Studio; the topbar
  // grows an expand button + compact brand while collapsed.
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('gw_sidebar_collapsed') === '1'; } catch { return false; }
  });
  const setCollapsed = (v: boolean) => {
    setNavCollapsed(v);
    try { localStorage.setItem('gw_sidebar_collapsed', v ? '1' : '0'); } catch { /* private mode */ }
  };

  // All Tools sheet — owned here, not by either nav surface, so a phone
  // (Sidebar hidden, MobileNav inside a Sheet drawer) never ends up with
  // two independent sheets fighting over open state. Both NavShelf
  // instances below call the same `openAllTools`.
  const [allToolsOpen, setAllToolsOpen] = useState(false);
  const openAllTools = () => setAllToolsOpen(true);
  const {
    available: allToolsAvailable, pinned: allToolsPinned, canPin: allToolsCanPin, onPin: allToolsOnPin,
  } = useAllToolsCatalog();

  // Global ⌘K / Ctrl+K — registered once here (not once per nav surface),
  // removed on unmount. Reads document.activeElement rather than the
  // event's own target: a window-level keydown listener sees `target` as
  // whatever dispatched the event, which for a real keypress while focused
  // in a text field IS that field, but tests dispatch on `window` directly
  // (see DashboardShell.allTools.test.tsx) — activeElement is the only
  // signal that works both ways. Must not hijack typing in the messenger
  // or the score search, hence the input/textarea/contenteditable guard.
  //
  // The contenteditable check reads via `closest('[contenteditable]:not(
  // [contenteditable="false"])')` rather than `el.isContentEditable`:
  // jsdom doesn't implement the `HTMLElement.isContentEditable` IDL
  // attribute at all (it reads back `undefined`, not `false`, even on an
  // element with the `contenteditable` attribute set), so that branch was
  // untestable in this suite — a bug there could ship silently. The
  // attribute selector is real DOM the test can actually set and jsdom can
  // actually query, and `closest` also covers focus landing on a
  // descendant of the editable root (contenteditable regions don't always
  // receive focus on their own outermost element).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return;
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (active?.closest('[contenteditable]:not([contenteditable="false"])')) return;
      e.preventDefault();
      setAllToolsOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Guards the RENDER, not the hooks above: every hook in this component
  // must run on every render regardless of nesting (rules-of-hooks), so
  // this early-out has to come after all of them, not before.
  if (alreadyInsideShell) return <>{children}</>;

  return (
    <DashboardShellNestedContext.Provider value={true}>
    <AssistantProvider>
      {/* h-screen + overflow-hidden pins the shell to the viewport so the
          sidebar rail stays put — each <main> scrolls INSIDE its column
          instead of pushing the whole document (which used to drag the
          sidebar off-screen with it). */}
      <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
        {!navCollapsed && <Sidebar onCollapse={() => setCollapsed(true)} onOpenAllTools={openAllTools} />}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Trial countdown — self-gates on trial state so it renders null
              for grandfathered / paid / loading / no-tenant. */}
          <TrialBanner />
          <TopBar navCollapsed={navCollapsed} onExpandNav={() => setCollapsed(false)} onOpenAllTools={openAllTools} />
          {/* pt-3 gives every page a small breath of space below the
              sticky topbar — pages that want more (CommandCenter, Viewer
              landing) add their own larger top padding on top of this.
              The bottom padding reserves room for the docked MobileBottomNav
              bar (below md; md+ has the sidebar instead) so content ends
              ABOVE it and never scrolls under. Bar = 56px tall + the bottom
              safe-area inset, plus a small gap. */}
          <main className={cn(
            "flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden",
            "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0",
            // Calendar manages its own compact header spacing — no extra
            // breathing room below the topbar. Tour Manager used to be
            // exempt here too, back when it shipped its own full-height
            // shell; it's an ordinary DashboardPageShell page now.
            isCalendar ? "pt-0" : "pt-3 sm:pt-4",
          )}>{children}</main>
        </div>
        {/* Persistent bottom nav below md. Self-gates via useIsCompactNav()
            so it returns null once the sidebar exists — safe to mount
            globally. */}
        <MobileBottomNav />
        {/* Mounts only when ?tour=admin is in the URL; otherwise a no-op. */}
        <ProductTour />
        {/* Floating assistant mic + chat window (shared thread lives in
            AssistantProvider so it survives navigation between pages). */}
        <AssistantFab />
        <AssistantMiniPlayer />
        <AssistantSheet />
        {/* All Tools — the one searchable catalog behind both nav surfaces'
            "All Tools" row and global ⌘K/Ctrl+K. Rendered exactly once so a
            phone user (Sidebar hidden, MobileNav in its own drawer) never
            gets two independent sheets. */}
        <AllToolsSheet
          open={allToolsOpen}
          onOpenChange={setAllToolsOpen}
          available={allToolsAvailable}
          pinned={allToolsPinned}
          canPin={allToolsCanPin}
          onPin={allToolsOnPin}
        />
      </div>
    </AssistantProvider>
    </DashboardShellNestedContext.Provider>
  );
}

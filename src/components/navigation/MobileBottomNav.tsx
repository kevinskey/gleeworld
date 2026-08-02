import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useIsCompactNav } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantModules } from '@/hooks/useModuleAccess';
import { isFacultyProfile } from '@/lib/roles';
import { getTabItems, type ModuleFlags } from '@/lib/navigation/appDestinations';
import { toModuleFlags } from '@/lib/navigation/moduleFlags';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  className?: string;
}

// Flagless-core tabs — always present regardless of role/module state.
// Used as the render set while module data is loading so tabs only ever
// APPEND when data lands, never swap identity (no Academy/Attendance flash).
const CORE_TAB_KEYS = new Set(['home', 'messages', 'schedule']);

export const MobileBottomNav = ({ className }: MobileBottomNavProps) => {
  // Only the cheap layout check runs on every mount, including desktop.
  // All data hooks (useUserRole, useTenantModules) live in PhoneTabBar
  // below and only mount — and only then fetch — once we know we're
  // below md, so desktop never pays for a duplicate profile/module fetch.
  // Gate is <768 (matching the sidebar's `md:` gate), not <640: the
  // 640-767 band (iPad mini portrait) has no sidebar, so the tab bar must
  // carry navigation there too.
  const isCompactNav = useIsCompactNav();

  if (!isCompactNav) return null;
  if (typeof document === 'undefined') return null;

  return <PhoneTabBar className={className} />;
};

const PhoneTabBar = ({ className }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, loading: roleLoading } = useUserRole();
  const isFaculty = isFacultyProfile(profile);

  // Single query (react-query dedupes/caches by key with any other
  // useTenantModules()/useModuleAccess() callers on the page) — derive
  // every flag from the one tenant module list rather than issuing a
  // separate query per module_id.
  const { data: modules = [], isLoading: modulesLoading } = useTenantModules();
  const flags: ModuleFlags = toModuleFlags(modules);
  const allTabs = getTabItems(isFaculty ? 'faculty' : 'student', flags);
  // Two independent async sources feed the tab set, and BOTH must resolve
  // before we render role/flag-dependent tabs:
  //  1. Modules — while loading, `flags` defaults every gated slot to `false`
  //     (via `modules = []`), so `allTabs` would render the flag-off fallback
  //     set and then swap identity once data lands.
  //  2. Role — while the profile is still loading, `isFacultyProfile(null)`
  //     is `false`, so `allTabs` uses the STUDENT tab order (which includes
  //     Studio at slot 3). A faculty user would then see Studio flash in and
  //     get replaced by Music once the profile resolves to the faculty order.
  // The core tabs (Home/Messages/Calendar) are identical across roles and
  // flag states, so render only those until BOTH sources resolve — tabs then
  // only ever append, never swap identity.
  const tabs = (modulesLoading || roleLoading)
    ? allTabs.filter((t) => CORE_TAB_KEYS.has(t.key))
    : allTabs;

  // Portal to document.body so the bar is always anchored to the visual
  // viewport. If MobileBottomNav rendered inline inside DashboardShell,
  // any ancestor with `transform`, `filter`, `will-change`, `contain`,
  // or `backdrop-filter` (we use these on a few studio + viewer surfaces)
  // would silently become the containing block for `position: fixed`
  // and the bar would scroll up with content on swipe. The portal moves
  // it out of every page wrapper and into the body so the initial
  // containing block (= viewport) wins.
  //
  // Docked solid bar: full-width, flush to the very bottom, opaque — it is
  // the lowest UI element and content never scrolls under it (the shells
  // reserve matching bottom padding). The bottom safe-area inset is padding
  // INSIDE the bar so the icons clear the home indicator while the bar's
  // own background still reaches the physical bottom edge.
  return createPortal(
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30",
        "bg-card border-t border-border/70",
        "shadow-[0_-2px_12px_rgba(15,23,42,0.06)]",
        "pointer-events-auto",
        className
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        // Promote to its own GPU layer so iOS WKWebView doesn't repaint
        // it against the document scroll position during momentum
        // scrolling — that's the visual glitch the user saw as
        // "footer goes up on swipe". (Omitting `will-change: transform`
        // on purpose: keeping a permanent compositing hint here has
        // been seen to starve other WKWebView paints on long pages.)
        transform: 'translateZ(0)', // keep the WKWebView compositing fix
      }}
    >
      <div className="flex items-stretch w-full" style={{ minHeight: 56 }}>
        {tabs.map((t) => {
          const active = t.to === '/dashboard'
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => navigate(t.to)}
              aria-label={t.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[48px]',
                active ? 'text-[var(--tint)] font-semibold' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-2xs leading-none">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>,
    document.body,
  );
};

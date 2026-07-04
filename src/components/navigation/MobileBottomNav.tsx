import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useIsPhone } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantModules } from '@/hooks/useModuleAccess';
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
  // below and only mount — and only then fetch — once we know we're on
  // a phone, so desktop never pays for a duplicate profile/module fetch.
  const isPhone = useIsPhone();

  if (!isPhone) return null;
  if (typeof document === 'undefined') return null;

  return <PhoneTabBar className={className} />;
};

const PhoneTabBar = ({ className }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile } = useUserRole();
  const isFaculty = !!profile && (
    profile.is_admin || profile.is_super_admin
    || ['instructor', 'teacher', 'conductor'].includes((profile.role || '').toLowerCase())
  );

  // Single query (react-query dedupes/caches by key with any other
  // useTenantModules()/useModuleAccess() callers on the page) — derive
  // every flag from the one tenant module list rather than issuing a
  // separate query per module_id.
  const { data: modules = [], isLoading: modulesLoading } = useTenantModules();
  const flags: ModuleFlags = toModuleFlags(modules);
  const allTabs = getTabItems(isFaculty ? 'faculty' : 'student', flags);
  // While modules are still loading, `flags` defaults every gated slot to
  // `false` (via `modules = []`), so `allTabs` would render the flag-off
  // fallback set (e.g. Roster/Attendance instead of Academy) and then swap
  // identity once data lands. Render only the stable flagless-core tabs
  // until loading resolves so tabs only ever append, never swap.
  const tabs = modulesLoading ? allTabs.filter((t) => CORE_TAB_KEYS.has(t.key)) : allTabs;

  // Portal to document.body so the bar is always anchored to the visual
  // viewport. If MobileBottomNav rendered inline inside DashboardShell,
  // any ancestor with `transform`, `filter`, `will-change`, `contain`,
  // or `backdrop-filter` (we use these on a few studio + viewer surfaces)
  // would silently become the containing block for `position: fixed`
  // and the bar would scroll up with content on swipe. The portal moves
  // it out of every page wrapper and into the body so the initial
  // containing block (= viewport) wins. We also pin via the bottom
  // safe-area inset rather than depending on the scroll position.
  return createPortal(
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border shadow-2xl",
        "pointer-events-auto",
        className
      )}
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        // Promote to its own GPU layer so iOS WKWebView doesn't repaint
        // it against the document scroll position during momentum
        // scrolling — that's the visual glitch the user saw as
        // "footer goes up on swipe". (Omitting `will-change: transform`
        // on purpose: keeping a permanent compositing hint here has
        // been seen to starve other WKWebView paints on long pages.)
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex items-stretch w-full bg-background" style={{ minHeight: 56 }}>
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
                active ? 'text-primary shadow-[inset_0_2px_0_hsl(var(--primary))] font-semibold' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs leading-none">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>,
    document.body,
  );
};

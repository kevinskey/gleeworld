import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useIsPhone } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantModules } from '@/hooks/useModuleAccess';
import { getTabItems, type ModuleFlags } from '@/lib/navigation/appDestinations';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  className?: string;
}

export const MobileBottomNav = ({ className }: MobileBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPhone = useIsPhone();

  const { profile } = useUserRole();
  const isFaculty = !!profile && (
    profile.is_admin || profile.is_super_admin
    || ['instructor', 'teacher', 'conductor'].includes((profile.role || '').toLowerCase())
  );

  // Single query (react-query dedupes/caches by key with any other
  // useTenantModules()/useModuleAccess() callers on the page) — derive
  // every flag from the one tenant module list rather than issuing a
  // separate query per module_id.
  const { data: modules = [] } = useTenantModules();
  const hasModule = (moduleId: string) => modules.some((m) => m.module_id === moduleId);
  const flags: ModuleFlags = {
    hasViewer: hasModule('viewer'),
    hasPartTracks: hasModule('part_tracks'),
    hasStudio: hasModule('studio'),
    hasSightReading: hasModule('sight_reading'),
    hasBoxOffice: hasModule('box_office'),
    hasConcertPlanner: hasModule('concert_planner'),
    hasMerch: hasModule('merch'),
    hasFinance: hasModule('finance'),
    hasAcademy: true, // Academy is core, not a gated add-on.
  };
  const tabs = getTabItems(isFaculty ? 'faculty' : 'student', flags);

  if (!isPhone) return null;
  if (typeof document === 'undefined') return null;

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

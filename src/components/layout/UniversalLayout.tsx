import { createContext, ReactNode, useContext } from "react";
import { useLocation } from "react-router-dom";

// Idempotence guard. Pages self-wrap in <UniversalLayout> while routes in
// App.tsx often already wrap them — nested instances would double the
// header/footer/shell tinting. Nested instances short-circuit to a
// pass-through so any wrap-order works.
const UniversalLayoutNestedContext = createContext(false);
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UniversalHeader } from "./UniversalHeader";
import { PublicHeader } from "./PublicHeader";
import { UniversalFooter } from "./UniversalFooter";
import { PageContainer } from "./PageContainer";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useBrandingSettings } from "@/hooks/useBrandingSettings";

// Tenant subdomains should never see UniversalHeader (it's the gleeworld.org
// marketing/platform-owner chrome). Detect the bootstrap tenant once at
// module load and use it to swap in DashboardShell instead.
const BOOT_TENANT = typeof window !== 'undefined'
  ? (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant
  : undefined;
const IS_TENANT_DOMAIN = !!BOOT_TENANT && BOOT_TENANT !== 'main';

// Mix two hex colors to produce a soft tinted shell — light primary fades to
// the cream default, dark primaries lift toward a near-white that still keeps
// the tenant's hue. Keeps the dashboard readable while staying on-brand.
function tint(hex: string, weight = 0.08): string {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return 'hsl(40, 10%, 96%)';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number, base = 245) => Math.round(c * weight + base * (1 - weight));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

interface UniversalLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";
  containerized?: boolean;
  viewMode?: 'admin' | 'member';
  onViewModeChange?: (mode: 'admin' | 'member') => void;
}
export const UniversalLayout = ({
  children,
  showHeader = true,
  showFooter = true,
  className = "",
  maxWidth = "7xl",
  containerized = true,
  viewMode,
  onViewModeChange
}: UniversalLayoutProps) => {
  const alreadyInsideLayout = useContext(UniversalLayoutNestedContext);
  if (alreadyInsideLayout) return <>{children}</>;
  const location = useLocation();
  const { settings: branding } = useBrandingSettings();

  // Pull the tenant's public-site theme so the admin shell stays in lockstep
  // with the brand colors the user picked in the page builder.
  const { data: publicSite } = useQuery<{ theme?: { primaryColor?: string; accentColor?: string } } | null>({
    queryKey: ['tenant-public-site'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tenant_public_site');
      if (error) return null;
      return data as any;
    },
  });
  // Branding owns the palette; the public-site theme is only the fallback for
  // tenants that haven't set branding colors yet — the same merge order
  // TenantThemeRoot uses. The shell tint is the ONLY color this layout
  // derives; the shadcn tokens themselves come from TenantThemeRoot on
  // <html> and must never be re-declared inline here (an inline --primary
  // shadowed the root value for every descendant, so Branding color changes
  // silently never showed anywhere inside the layout).
  const primary = branding.primary_color || publicSite?.theme?.primaryColor;
  const shellBackground = primary ? tint(primary, 0.06) : 'hsl(40, 10%, 96%)';

  // Use PublicHeader for public, fan, graduates, academy, and calendar pages
  const usePublicHeaderPaths = ['/dashboard/public', '/dashboard/fan', '/graduates', '/glee-academy', '/public-calendar'];
  const shouldUsePublicHeader =
    usePublicHeaderPaths.includes(location.pathname) ||
    location.pathname.startsWith('/glee-academy') ||
    location.pathname.startsWith('/concert-tickets') ||
    location.pathname.startsWith('/tickets/') ||
    location.pathname.startsWith('/box-office');

  // Tenants never see UniversalHeader — that's the platform marketing chrome.
  // Render DashboardShell instead, which gives them the same admin topbar +
  // sidebar they see on Command Center.
  if (IS_TENANT_DOMAIN && showHeader && !shouldUsePublicHeader) {
    return (
      <UniversalLayoutNestedContext.Provider value={true}>
        <DashboardShell>{children}</DashboardShell>
      </UniversalLayoutNestedContext.Provider>
    );
  }

  return <UniversalLayoutNestedContext.Provider value={true}><div
    className="flex flex-col min-h-screen w-full"
    style={{ background: shellBackground }}
  >
      {/* Fixed Header */}
      {showHeader && (shouldUsePublicHeader ? <PublicHeader /> : <UniversalHeader viewMode={viewMode} onViewModeChange={onViewModeChange} />)}

      {/* Main Content - padded by header height only when header is shown.
          Bottom padding reserves room for the docked MobileBottomNav bar on
          phones (56px + safe-area inset) so content ends above it; sm+ has no
          bottom nav and only clears the safe-area inset. Kept in the class
          (not inline) so the phone-only bar clearance can vary by breakpoint. */}
      <main className={`w-full flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-[env(safe-area-inset-bottom,0px)] ${showHeader ? 'pt-[calc(var(--gw-header-h,4rem)+var(--gw-radio-bar-height,0px))]' : ''} text-foreground ${className}`} style={{
      background: shellBackground,
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    }}>
        {containerized ? <PageContainer maxWidth="full" padded={false} className="!p-0 !m-0">
          {children}
        </PageContainer> : children}
      </main>

      {showFooter && <UniversalFooter />}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div></UniversalLayoutNestedContext.Provider>;
};
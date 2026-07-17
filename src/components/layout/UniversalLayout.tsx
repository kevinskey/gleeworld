import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UniversalHeader } from "./UniversalHeader";
import { PublicHeader } from "./PublicHeader";
import { UniversalFooter } from "./UniversalFooter";
import { PageContainer } from "./PageContainer";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

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

// Convert a hex color to the "h s% l%" triplet the shadcn design tokens use
// (e.g. `hsl(var(--primary))` resolves the variable as raw H/S/L numbers).
// Returns null when we can't parse, so the caller can leave the default.
function hexToHslTriplet(hex: string): string | null {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hh = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }
  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function yiqForeground(hex: string): string | null {
  const h = (hex || '').replace('#', '').trim();
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '0 0% 6%' : '0 0% 100%';
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
  const location = useLocation();

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
  const primary = publicSite?.theme?.primaryColor;
  const accent = publicSite?.theme?.accentColor;
  const shellBackground = primary ? tint(primary, 0.06) : 'hsl(40, 10%, 96%)';
  // Override the shadcn --primary token with the tenant's accent so default
  // buttons (which render bg-primary text-primary-foreground) tint
  // automatically across the admin. Falls back to the design-system default
  // when no accent is set.
  const accentTriplet = accent ? hexToHslTriplet(accent) : null;
  const accentFgTriplet = accent ? yiqForeground(accent) : null;

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
    return <DashboardShell>{children}</DashboardShell>;
  }

  return <div
    className="flex flex-col min-h-screen w-full"
    style={{
      background: shellBackground,
      // Expose tenant theme as CSS variables so any descendant component can
      // tint itself with var(--site-primary) / var(--site-accent), and
      // override the shadcn --primary token so default buttons take the
      // tenant accent (gold for demo) instead of the platform blue.
      ['--site-primary' as any]: primary || undefined,
      ['--site-accent' as any]: accent || undefined,
      ['--primary' as any]: accentTriplet || undefined,
      ['--primary-foreground' as any]: accentFgTriplet || undefined,
      ['--ring' as any]: accentTriplet || undefined,
      // Outline buttons hover with bg-accent / text-accent-foreground. Tie
      // those to the tenant accent so any "ghost" / "outline" button fills
      // gold on hover instead of the default light-gray.
      ['--accent' as any]: accentTriplet || undefined,
      ['--accent-foreground' as any]: accentFgTriplet || undefined,
    }}
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
    </div>;
};
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleBasedRedirect } from '@/hooks/useRoleBasedRedirect';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';
import TenantLanding from '@/pages/TenantLanding';
import { supabase } from '@/integrations/supabase/client';
import { isCustomDomainHost } from '@/lib/tenant/customDomainHost';
import { PublicSiteView, type PublicSitePayload } from '@/components/public-site/PublicSiteView';

/**
 * The `/` route.
 *   - Loading auth → spinner.
 *   - Main tenant (gleeworld.org) → GleeWorld marketing site (GleeWorldLanding).
 *     The hero slot on that page already reads from the universal slider
 *     manager, so the admin still controls the hero from /control-center;
 *     we no longer need to swap to TenantLanding when a slide exists.
 *   - A tenant's own branded domain → their built public site, at the bare
 *     root (see CustomDomainHome).
 *   - Any other tenant → that tenant's own public landing page.
 *   - Authenticated users → useRoleBasedRedirect sends them to their
 *     role's home; landing renders meanwhile to avoid flash.
 */
export const HomeRoute = () => {
  const { loading } = useAuth();
  const tenantSlug = (window as any).__TENANT_CONFIG__?.tenant;

  // Computed synchronously from the hostname so the redirect hook can be
  // disabled on the very first render — a branded domain's root is public
  // by definition, and bouncing a signed-in admin to Command Center there
  // means the owner can never see their own site without signing out.
  const brandedRoot = isCustomDomainHost(window.location.host) && !!tenantSlug && tenantSlug !== 'main';
  // ANY tenant's root is their public site — bouncing a signed-in member
  // to Command Center made the public site unreachable while logged in
  // (Kevin, 2026-08-13: "it blinks back to the command center"), and broke
  // the nav's Public Site entry. Only the main platform root still
  // redirects authenticated users.
  const publicRoot = !!tenantSlug && tenantSlug !== 'main';

  useRoleBasedRedirect({ enabled: !publicRoot });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading…" />
      </div>
    );
  }

  if (brandedRoot) return <CustomDomainHome slug={tenantSlug} />;
  if (!tenantSlug || tenantSlug === 'main') return <GleeWorldLanding />;
  return <TenantLanding />;
};

/**
 * The built public site, served at the root of a branded domain so the URL
 * reads `example.org/` rather than `example.org/sites/example`.
 *
 * Falls back to TenantLanding when the tenant has no published site — the
 * bare PublicSitePage renders a "Page not found" screen in that case, which
 * is the wrong thing to show visitors arriving at a domain that works.
 *
 * Shares the ['public-site', slug] query key with PublicSitePage, so
 * navigating between the two costs nothing.
 */
function CustomDomainHome({ slug }: { slug: string }) {
  const { data, isLoading } = useQuery<PublicSitePayload | null>({
    queryKey: ['public-site', slug],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_site', { p_slug: slug });
      if (error) throw error;
      return (data as PublicSitePayload) ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!data) return <TenantLanding />;
  return <PublicSiteView data={data} slug={slug} memberSignIn pageHref={(p) => (p === 'home' ? '/' : `/${p}`)} />;
}

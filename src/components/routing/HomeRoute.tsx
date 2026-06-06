import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleBasedRedirect } from '@/hooks/useRoleBasedRedirect';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';
import TenantLanding from '@/pages/TenantLanding';
import { supabase } from '@/integrations/supabase/client';

/**
 * The `/` route. Responsibilities:
 *   1. While auth is loading → spinner.
 *   2. Anonymous + "view as public" users:
 *        - Main tenant (gleeworld.org) → GleeWorld product marketing page
 *        - Any other tenant → that tenant's own public landing page
 *   3. Authenticated users → useRoleBasedRedirect sends them to their
 *      role's home; we render landing in the meantime to avoid flash.
 */
export const HomeRoute = () => {
  const { loading } = useAuth();
  useRoleBasedRedirect();

  const tenantSlug = (window as any).__TENANT_CONFIG__?.tenant;

  // For 'main' we render the platform marketing page UNLESS the operator has
  // added a hero slide — in which case they're using main as a real tenant site
  // and want TenantLanding to render their content.
  const { data: heroCount } = useQuery({
    queryKey: ['main-has-hero'],
    queryFn: async () => {
      if (tenantSlug !== 'main') return 0;
      const { count } = await supabase
        .from('gw_hero_slides')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      return count ?? 0;
    },
    enabled: tenantSlug === 'main',
    staleTime: 60_000,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading…" />
      </div>
    );
  }

  if (!tenantSlug) return <GleeWorldLanding />;
  if (tenantSlug === 'main' && (heroCount ?? 0) === 0) return <GleeWorldLanding />;
  return <TenantLanding />;
};

import { useAuth } from '@/contexts/AuthContext';
import { useRoleBasedRedirect } from '@/hooks/useRoleBasedRedirect';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';
import TenantLanding from '@/pages/TenantLanding';

/**
 * The `/` route.
 *   - Loading auth → spinner.
 *   - Main tenant (gleeworld.org) → GleeWorld marketing site (GleeWorldLanding).
 *     The hero slot on that page already reads from the universal slider
 *     manager, so the admin still controls the hero from /control-center;
 *     we no longer need to swap to TenantLanding when a slide exists.
 *   - Any other tenant → that tenant's own public landing page.
 *   - Authenticated users → useRoleBasedRedirect sends them to their
 *     role's home; landing renders meanwhile to avoid flash.
 */
export const HomeRoute = () => {
  const { loading } = useAuth();
  useRoleBasedRedirect();

  const tenantSlug = (window as any).__TENANT_CONFIG__?.tenant;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading…" />
      </div>
    );
  }

  if (!tenantSlug || tenantSlug === 'main') return <GleeWorldLanding />;
  return <TenantLanding />;
};

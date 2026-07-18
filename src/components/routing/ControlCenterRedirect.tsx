// /control-center is a legacy path. It used to be the platform owner's
// site-wide tooling surface; that identity got reassigned to /admin/tenants
// (the "Platform Home" tenant list — see PlatformTenantsPortal) while
// /control-center itself was blanket-redirected to /dashboard for everyone.
// That blanket redirect is wrong for the platform owner specifically: their
// old bookmarks/links should land them back on the mother site, not the
// ordinary per-tenant Command Center. Everyone else keeps the /dashboard
// redirect unchanged.
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export function ControlCenterRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading, error: profileError } = useUserProfile(user);

  // useUserProfile's `loading` flag starts `false` and only flips true once
  // its own fetch effect fires — there's a one-render window right after
  // mount where `profileLoading` is false AND `userProfile` is still null.
  // Navigating in that window sends the platform owner to /dashboard before
  // their real profile (is_super_admin) has ever loaded. Wait for the fetch
  // to actually resolve — a profile or an error — not just the loading flag.
  const profileSettled = !!userProfile || !!profileError;
  if (authLoading || (user && !profileSettled)) return null;

  const tenantSlug = typeof window !== 'undefined'
    ? (window as any).__TENANT_CONFIG__?.tenant
    : null;
  const isPlatformOwner = !!userProfile?.is_super_admin && tenantSlug === 'main';

  return <Navigate to={isPlatformOwner ? '/admin/tenants' : '/dashboard'} replace />;
}

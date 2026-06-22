import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useBrandingSettings } from "@/hooks/useBrandingSettings";
import { supabase } from "@/integrations/supabase/client";

/**
 * Post-login routing for the choir/band template.
 *
 * Roles (from least → most privileged), with destinations:
 *   fan         → /fan            — public fan portal (newsletter, ticket requests)
 *   graduate    → /alumni         — graduates dashboard
 *   student     → /dashboard      — Command Center (operational daily triage)
 *   member      → /dashboard      — Command Center
 *   instructor  → /dashboard      — Command Center (same view; role-aware data)
 *   admin       → /dashboard      — Command Center (extra admin modules)
 *   super-admin → /control-center — site-owner / super-admin tooling
 *
 * Two ways the user lands here:
 *   1. Fresh login — `redirectAfterAuth` is set in sessionStorage, OR they
 *      arrived on `/auth`. We do redirect them on the next render.
 *   2. They're an authenticated user typing `/` directly. We honor a
 *      "force-public-view" sessionStorage flag if they explicitly clicked
 *      "View as public" in the header; otherwise we still redirect.
 *
 * Anything else (deep links into protected routes, navigating manually) is
 * left alone — we don't grab people away from where they were going.
 */
export const useRoleBasedRedirect = () => {
  const { user, loading } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { settings: branding } = useBrandingSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  // Tenant slug is needed to distinguish platform super-admin (main tenant)
  // from tenant super-admins (everyone else). Pulled from the JWT claim
  // populated by the custom_access_token_hook on login.
  useEffect(() => {
    if (!user) { setTenantSlug(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const claims: any = data.session?.user?.app_metadata
        || (data.session && JSON.parse(
            atob((data.session.access_token.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/') + '==')
          ));
      const slug = (claims?.tenant_slug as string | undefined) || null;
      if (!cancelled) setTenantSlug(slug);
    })().catch(() => { /* leave null */ });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    // No profile row yet → onboarding (unless they're explicitly on a public surface).
    if (!userProfile) {
      const publicSurfaces = ['/', '/about', '/contact', '/calendar', '/public-calendar', '/shop', '/press-kit', '/booking-request', '/auth'];
      if (!publicSurfaces.includes(location.pathname) && location.pathname !== '/onboarding') {
        navigate('/onboarding', { replace: true });
      }
      return;
    }

    // Block off auto-redirect when the user explicitly chose to view the
    // public home — either via the header's "View as public" toggle
    // (sessionStorage) or via ?preview=1 in the URL (carries across tabs).
    if (location.pathname === '/') {
      const search = new URLSearchParams(location.search);
      if (search.get('preview') === '1' || sessionStorage.getItem('force-public-view') === '1') {
        sessionStorage.removeItem('force-public-view');
        return;
      }
    }

    // Only auto-redirect on root or directly after auth — not on deep links.
    const isPostLogin = sessionStorage.getItem('redirectAfterAuth') !== null || location.pathname === '/auth';
    if (location.pathname !== '/' && !isPostLogin) {
      return;
    }

    // Previously: brand-new tenants force-redirected super-admins to
    // /admin/site-setup. Removed — site-setup is reachable from Control Center
    // and the wizard kept trapping admins after initial setup.

    // Compute the role destination.
    const dest = pickDestination({ ...userProfile, tenant_slug: tenantSlug });
    if (dest && dest !== location.pathname) {
      sessionStorage.removeItem('redirectAfterAuth');
      navigate(dest, { replace: true });
    }
  }, [user, userProfile, loading, navigate, location.pathname, tenantSlug]);

  return { userProfile, loading };
};

export function pickDestination(profile: {
  role?: string | null;
  is_super_admin?: boolean | null;
  is_admin?: boolean | null;
  tenant_slug?: string | null;
}): string | null {
  // Canonical role hierarchy (highest → lowest privilege):
  //   platform super-admin (super-admin on the 'main' tenant) → /control-center
  //   tenant super-admin   (super-admin on any other tenant)  → /dashboard
  //   admin       → /dashboard        (Command Center — daily triage feed)
  //   instructor  → /dashboard        (Command Center — same operational view)
  //   alumni      → /alumni           (graduated members)
  //   member      → /dashboard        (current choir/class members)
  //   student     → /dashboard        (same Command Center as members/instructors)
  //   auditioner  → /auditioner       (in the audition pipeline)
  //   vip / fan   → /fan              (signed-up supporters; vip = fan with extra privileges)
  const isSuper = profile.is_super_admin || profile.role === 'super-admin';
  if (isSuper) {
    // Only the platform owner (super-admin on the main tenant) gets the
    // site-wide /control-center surface. Tenant super-admins manage their
    // own tenant from the standard Command Center.
    return profile.tenant_slug === 'main' ? '/control-center' : '/dashboard';
  }
  if (profile.is_admin || profile.role === 'admin') return '/dashboard';
  if (profile.role === 'instructor') return '/dashboard';
  if (profile.role === 'alumni' || profile.role === 'graduate' || profile.role === 'graduates') return '/alumni';
  if (profile.role === 'student') return '/dashboard';
  if (profile.role === 'member') return '/dashboard';
  if (profile.role === 'auditioner') return '/auditioner';
  if (profile.role === 'fan' || profile.role === 'vip') return '/fan';
  return null;
}

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useBrandingSettings } from "@/hooks/useBrandingSettings";

/**
 * Post-login routing for the choir/band template.
 *
 * Roles (from least → most privileged), with destinations:
 *   fan      → /fan        — public fan portal (newsletter, ticket requests)
 *   graduate   → /graduates    — graduates dashboard
 *   member   → /dashboard  — full member dashboard
 *   admin    → /dashboard  — admin uses the same dashboard with extra modules
 *   super-admin → /control-center  — site-owner / super-admin tooling
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
    const dest = pickDestination(userProfile);
    if (dest && dest !== location.pathname) {
      sessionStorage.removeItem('redirectAfterAuth');
      navigate(dest, { replace: true });
    }
  }, [user, userProfile, loading, navigate, location.pathname]);

  return { userProfile, loading };
};

function pickDestination(profile: {
  role?: string | null;
  is_super_admin?: boolean | null;
  is_admin?: boolean | null;
}): string | null {
  // Canonical role hierarchy (highest → lowest privilege):
  //   super-admin → /control-center   (runs the site)
  //   admin       → /dashboard        (delegated admin powers)
  //   alumni      → /alumni           (graduated members)
  //   member      → /dashboard        (current choir/class members; "student" == "member")
  //   auditioner  → /auditioner-dashboard (in the audition pipeline)
  //   vip / fan   → /fan              (signed-up supporters; vip = fan with extra privileges)
  if (profile.is_super_admin || profile.role === 'super-admin') return '/control-center';
  if (profile.is_admin || profile.role === 'admin') return '/dashboard';
  if (profile.role === 'alumni' || profile.role === 'graduate' || profile.role === 'graduates') return '/alumni';
  if (profile.role === 'student') return '/academy';
  if (profile.role === 'member') return '/dashboard';
  if (profile.role === 'auditioner') return '/auditioner';
  if (profile.role === 'fan' || profile.role === 'vip') return '/fan';
  return null;
}

// Tenant-level demo detection (is this SUBDOMAIN the interactive public
// demo?). For session-level detection (is this VISITOR a read-only
// prospect?) use getDemoSessionRole() from '@/lib/demoSession' —
// demo-admin browses the demo tenant without being a demo viewer.
//
// Deliberately checks ONLY the original 'demo' tenant (Harmony Hall
// Choir), not the four newer showcase-only tenants (see
// isShowcaseDemoTenant below) — this gates the /try session-minting flow
// and public-signup lockout in TryDemo.tsx / AuthPage.tsx, both of which
// assume the demo-login edge function's fixed accounts (which belong ONLY
// to the 'demo' tenant). Broadening this would sign a demo-choir/etc.
// visitor into a 'demo'-tenant session while browsing a different
// tenant's subdomain — the same cross-tenant-session bug class fixed by
// the 2026-07-16 current_tenant_id() patch, just re-introduced client-side.
export function isDemoTenant(): boolean {
  if (typeof window === 'undefined') return false;
  const slug = (window as unknown as { __TENANT_CONFIG__?: { tenant?: string } })
    .__TENANT_CONFIG__?.tenant;
  return slug === 'demo';
}

// Broader check: is this subdomain ANY of the demo/showcase tenants used
// on the landing page's "See it live" section (demo, demo-choir,
// demo-district, demo-school, demo-songwriter)? Unlike isDemoTenant(),
// this is safe to use for purely presentational purposes — e.g. showing a
// "you're viewing a live example, back to gleeworld.org" banner — since
// it never gates auth/session behavior. gw_tenants has no is_demo/
// demo_mode column to check this server-side, so this list is the single
// source of truth on the client; keep it in sync with gw_tenants if a new
// showcase tenant is added.
const SHOWCASE_DEMO_TENANT_SLUGS = new Set([
  'demo', 'demo-choir', 'demo-district', 'demo-school', 'demo-songwriter',
]);

export function isShowcaseDemoTenant(): boolean {
  if (typeof window === 'undefined') return false;
  const slug = (window as unknown as { __TENANT_CONFIG__?: { tenant?: string } })
    .__TENANT_CONFIG__?.tenant;
  return !!slug && SHOWCASE_DEMO_TENANT_SLUGS.has(slug);
}

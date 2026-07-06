// Tenant-level demo detection (is this SUBDOMAIN the public demo?).
// For session-level detection (is this VISITOR a read-only prospect?)
// use getDemoSessionRole() from '@/lib/demoSession' — demo-admin browses
// the demo tenant without being a demo viewer.

export function isDemoTenant(): boolean {
  if (typeof window === 'undefined') return false;
  const slug = (window as unknown as { __TENANT_CONFIG__?: { tenant?: string } })
    .__TENANT_CONFIG__?.tenant;
  return slug === 'demo';
}

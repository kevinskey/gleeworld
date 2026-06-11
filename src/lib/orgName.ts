// Tenant org name from the per-subdomain bootstrap (window.__TENANT_CONFIG__),
// set by tenant-bootstrap.js. Falls back to the platform name on the marketing
// domain, where no tenant is configured.
export function getOrgName(): string {
  if (typeof window !== 'undefined') {
    const org = (window as any).__TENANT_CONFIG__?.org;
    if (org) return org;
  }
  return 'GleeWorld';
}

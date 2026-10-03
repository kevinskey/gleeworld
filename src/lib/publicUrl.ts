// The web address to put in something a human or another device will open.
//
// On the web `window.location.origin` is exactly right. Inside the Capacitor
// app it is `capacitor://localhost`, which nothing outside the app can resolve
// — so any URL built from it is broken the moment it leaves the device. That
// bit QR attendance codes (unscannable), seating-chart share links, and
// Stripe's success_url (checkout could not return). Found 2026-10-03 by
// running the app in a simulator.
//
// Use this anywhere a URL is going to be: rendered into a QR code, copied by a
// user, sent to a payment provider, emailed, or otherwise handed to anything
// that is not this webview. For in-app navigation keep using relative paths.

/** Shape native-boot.js restores from localStorage into __TENANT_CONFIG__. */
interface TenantConfig {
  tenant?: string;
  customDomain?: string;
}

function tenantConfig(): TenantConfig | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { __TENANT_CONFIG__?: TenantConfig }).__TENANT_CONFIG__;
}

function normalizeDomain(value: string | undefined | null): string {
  return (value ?? '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

/**
 * Absolute, externally-resolvable base URL for the current tenant.
 *
 * Web: the real origin, unchanged.
 * Native: the tenant's custom domain if we cached one, else its
 * <slug>.gleeworld.org subdomain, else the platform apex.
 */
export function publicBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://gleeworld.org';

  // A real http(s) page is already serving from the right place — including
  // localhost during development, where rewriting to production would be
  // actively unhelpful.
  const protocol = window.location.protocol;
  if (protocol === 'http:' || protocol === 'https:') {
    return window.location.origin;
  }

  const cfg = tenantConfig();
  const domain = normalizeDomain(cfg?.customDomain);
  if (domain) return `https://${domain}`;

  const slug = (cfg?.tenant ?? '').trim();
  // 'main' is the platform tenant and lives on the apex, not main.gleeworld.org.
  if (slug && slug !== 'main') return `https://${slug}.gleeworld.org`;
  return 'https://gleeworld.org';
}

/** publicBaseUrl() + a path. Accepts paths with or without a leading slash. */
export function publicUrl(path: string): string {
  const base = publicBaseUrl();
  if (!path) return base;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

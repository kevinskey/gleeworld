import { Capacitor } from '@capacitor/core';
import type { Session } from '@supabase/supabase-js';

const KEY = 'gw_native_tenant';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

function decodeTenantSlug(session: Session): string | null {
  try {
    const p = session.access_token.split('.')[1];
    const padded = p + '='.repeat((-p.length) % 4);
    const claims = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
    return claims.tenant_slug || null;
  } catch {
    return null;
  }
}

// On native, the bundle has no per-subdomain tenant-bootstrap.js. After login,
// cache the tenant from the JWT so native-boot.js can restore it on next boot,
// then reload once so the module-level Supabase client picks up the tenant
// headers and branding.
export async function syncNativeTenant(session: Session): Promise<void> {
  if (!isNativeApp()) return;
  const slug = decodeTenantSlug(session);
  if (!slug) return;

  const current = (window as any).__TENANT_CONFIG__;
  if (current?.tenant === slug) return;

  let org: string | undefined;
  if (slug !== 'main') try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('gw_tenants')
      .select('name')
      .eq('slug', slug)
      .maybeSingle();
    org = data?.name;
  } catch { /* org stays undefined; branding falls back */ }

  localStorage.setItem(KEY, JSON.stringify({ tenant: slug, org }));
  window.location.reload();
}

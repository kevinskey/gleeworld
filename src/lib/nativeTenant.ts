import { Capacitor } from '@capacitor/core';
import type { Session } from '@supabase/supabase-js';

const KEY = 'gw_native_tenant';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function decodeTenantSlug(session: Session): string | null {
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
// cache the tenant from the JWT — AND the tenant's short_name + logo_url from
// gw_branding_settings — so native-boot.js can restore the full brand on
// next boot. Reload once so the module-level Supabase client + sidebar pick
// up the tenant headers / short name / logo immediately.
export async function syncNativeTenant(session: Session): Promise<void> {
  if (!isNativeApp()) return;
  const slug = decodeTenantSlug(session);
  if (!slug) return;

  const current = (window as any).__TENANT_CONFIG__;
  // Re-sync if we don't have full branding cached yet (older builds only
  // stored {tenant, org} — refresh to get shortName + logoUrl too).
  if (current?.tenant === slug && current?.shortName && current?.logoUrl) return;

  // 'main' is the platform/marketing tenant. syncNativeTenant used to
  // refuse to cache it (a JWT with tenant_slug='main' was treated as an
  // ambiguous platform-admin who needed to pick a choir). That's now
  // wrong: NativeTenantGate explicitly wants to LAND a super-admin on
  // main when their memberships include it, so respect the slug either
  // way. Skipping the branding fetch below is still fine — the main
  // tenant has no tenant_row/branding of its own (it's the platform
  // shell) — so we cache the minimal payload and reload.
  if (slug === 'main') {
    if (current?.tenant === 'main') return; // already there, no reload needed
    localStorage.setItem(KEY, JSON.stringify({ tenant: 'main' }));
    window.location.reload();
    return;
  }

  // Seed with the existing cache so a failed DB fetch can't wipe a valid
  // org/shortName/logoUrl that the picker (or a previous sync) wrote.
  const sameTenant = current?.tenant === slug;
  let org: string | undefined = sameTenant ? current?.org : undefined;
  let shortName: string | undefined = sameTenant ? current?.shortName : undefined;
  let logoUrl: string | undefined = sameTenant ? current?.logoUrl : undefined;

  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const tenantRow = await supabase
      .from('gw_tenants')
      .select('id, name')
      .eq('slug', slug)
      .maybeSingle();
    if (tenantRow.data?.name) org = tenantRow.data.name;
    const tenantId = tenantRow.data?.id;
    if (tenantId) {
      const branding = await supabase
        .from('gw_branding_settings')
        .select('short_name, logo_url')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (branding.data?.short_name) shortName = branding.data.short_name;
      if (branding.data?.logo_url) logoUrl = branding.data.logo_url;
    }
  } catch { /* keep existing cached values */ }

  const next = { tenant: slug, org, shortName, logoUrl };
  if (
    sameTenant &&
    current?.org === org &&
    current?.shortName === shortName &&
    current?.logoUrl === logoUrl
  ) {
    return;
  }
  localStorage.setItem(KEY, JSON.stringify(next));
  window.location.reload();
}

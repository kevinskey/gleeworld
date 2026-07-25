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

  // Preserve the user's explicit tenant pick. Once a tenant is cached
  // (whether from the initial post-login auto-open or a later swap via
  // the avatar dropdown's "Switch organization" list), sync must not
  // overwrite it just because the JWT's tenant_slug differs. Otherwise
  // a token refresh would silently yank Kevin out of kevinsworld and
  // back to main every ~1 hour. The switcher explicitly writes the
  // cache when the user picks a different world; leave that alone.
  if (current?.tenant) {
    // Refresh branding only if we're STILL on the same tenant the JWT
    // says (i.e., token refreshed on the same tenant) and we don't have
    // full brand data cached yet. Skip the branding refresh entirely
    // for cross-tenant JWTs — the cached tenant wins.
    if (current.tenant !== slug) return;
    if (current.shortName && current.logoUrl) return;
  }

  // 'main' is the platform/marketing tenant. Never AUTO-cache main from
  // a JWT — a super-admin's JWT often has tenant_slug='main' but the
  // user wants their real tenant to be home. NativeTenantGate's login
  // path handles the "no cached tenant" case via my_tenants → first
  // non-main. If they want to visit main, they use the switcher.
  if (slug === 'main') return;

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

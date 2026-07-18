// Cross-tenant sign-in handoff.
//
// A tenant user who signs in on gleeworld.org (or on the wrong subdomain)
// used to get a raw alert() and a bounce to /auth on their own site, where
// they had to type their password a second time — because the guard called
// signOut() before redirecting. This module resolves where they actually
// belong and hands the live session across, so the redirect lands them
// signed in.
//
// Why a token handoff works: every tenant's bootstrap points at the SAME
// Supabase instance (supabase.gleeworld.org) with the same anon key, so an
// access token minted on gleeworld.org is valid on <tenant>.gleeworld.org.
// It's only localStorage — which is origin-scoped — that doesn't follow the
// browser across the subdomain boundary. Passing the tokens in the URL
// fragment is the same mechanism the magic-link flow already uses
// (see AuthCallback.tsx); fragments are never sent to the server, and
// AuthCallback strips them via history.replaceState once consumed.
//
// If tenants are ever split onto separate Supabase projects, this handoff
// MUST be reduced to a plain redirect — a token from project A is not
// valid against project B.

import { supabase } from '@/integrations/supabase/client';

const ROOT_DOMAIN = 'gleeworld.org';

interface TenantHostRow {
  slug: string;
  subdomain: string | null;
  custom_domain: string | null;
}

/**
 * Turn a gw_tenants row into the host to send the user to.
 *
 * The `subdomain` column is not normalized: some rows hold a full host
 * ('demo-choir.gleeworld.org', 'gleeworld.org') and others hold a bare
 * label ('kevin'). Treating every value as a label produces
 * 'gleeworld.org.gleeworld.org' — the bug in PlatformTenantsPortal's local
 * tenantUrl() helper. Detect which form we have by looking for a dot.
 *
 * custom_domain is deliberately NOT preferred: this is a recovery path
 * where landing successfully is the entire point, and custom domains are
 * the least reliable hosts we have (a Cloudflare-proxied record sends the
 * SPA into a reload loop until it's grey-clouded, and the provisioning
 * verification gate only ever probes the gleeworld.org host). The canonical
 * subdomain is always provisioned. Callers wanting branded-domain behavior
 * should change this one function.
 */
export function tenantHostFromRow(row: TenantHostRow | null, slug: string): string {
  if (slug === 'main') return ROOT_DOMAIN;
  const sub = row?.subdomain?.trim();
  if (sub) return sub.includes('.') ? sub : `${sub}.${ROOT_DOMAIN}`;
  return `${slug}.${ROOT_DOMAIN}`;
}

/**
 * Look up the tenant's host. Falls back to `<slug>.gleeworld.org` on any
 * failure — a wrong-but-plausible host beats blocking the redirect, since
 * the fallback is correct for the overwhelming majority of tenants.
 */
export async function resolveTenantHost(slug: string): Promise<string> {
  if (slug === 'main') return ROOT_DOMAIN;
  try {
    const { data, error } = await supabase
      .from('gw_tenants')
      .select('slug, subdomain, custom_domain')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return tenantHostFromRow((data as TenantHostRow) ?? null, slug);
  } catch (e) {
    console.warn('[auth] tenant host lookup failed, using default host', e);
    return tenantHostFromRow(null, slug);
  }
}

/**
 * Build the URL that lands the user signed in on their own tenant.
 *
 * With tokens: /auth/callback#access_token=…&refresh_token=… — AuthCallback
 * calls setSession() and routes onward. Without them: plain /auth, so the
 * user at least arrives at the right site's login form.
 */
export function buildTenantHandoffUrl(
  host: string,
  tokens: { accessToken?: string | null; refreshToken?: string | null },
  next = '/dashboard',
): string {
  const { accessToken, refreshToken } = tokens;
  if (!accessToken || !refreshToken) {
    return `https://${host}/auth`;
  }
  const frag = new URLSearchParams({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return `https://${host}/auth/callback?next=${encodeURIComponent(next)}#${frag.toString()}`;
}

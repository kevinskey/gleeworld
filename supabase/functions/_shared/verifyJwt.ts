// Signature-verifying JWT claim reader for edge functions that use the
// raw-fetch (pgRead) style rather than a supabase-js client.
//
// The functions gateway runs VERIFY_JWT=false, so a bare
// `JSON.parse(atob(token.split('.')[1]))` trusts ANY token — a forged
// tenant_id / tenant_role='super-admin' is honored, which on the Box
// Office surface meant forging refunds, comps, check-ins, and Connect
// onboarding for any tenant. This asks GoTrue to validate the signature
// (same check supabase-js `getUser()` performs) BEFORE the claims are read.
//
// Returns the decoded claims (with verified `sub`/`email` overlaid) on a
// valid token, or null when missing / malformed / signature-invalid.
export async function verifyJwtClaims(
  accessToken: string | null | undefined,
): Promise<Record<string, any> | null> {
  if (!accessToken) return null;
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
  const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  let user: { id?: string; email?: string } | null = null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: ANON },
    });
    if (!res.ok) return null; // 401/403 → invalid or expired signature
    user = await res.json();
  } catch {
    return null;
  }
  if (!user?.id) return null;

  try {
    const claims = JSON.parse(
      atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    return { ...claims, sub: user.id, email: user.email };
  } catch {
    return null;
  }
}

// The GoTrue hook stamps every JWT with the caller's HOME tenant
// (tenant_id / tenant_role) — the WRONG tenant whenever an admin manages a
// workspace they aren't homed on, which is the common case (profiles are
// homed on 'main' while the admin membership lives on the customer tenant).
// Found 2026-08-17 on create-plan-checkout: legitimate tenant admins got
// 403, and super-admin actions targeted their home tenant. Admin-action
// functions resolve the TARGET tenant here instead: the frontend names it
// by tenant_slug; the JWT claims count only when they refer to that same
// tenant; otherwise the caller's gw_tenant_members role in the TARGET
// tenant (or the platform super-admin flag) decides.
//
// 'director' is the membership role GleeWorld actually grants tenant
// admins (see useUserRole MEMBER_ADMIN_ROLES).
export const TENANT_ADMIN_ROLES = ['owner', 'admin', 'director', 'super-admin', 'super_admin'];

export async function resolveTargetTenant(
  payload: Record<string, any>,
  slugRaw: string | null | undefined,
): Promise<{ tenantId: string | null; tenantRole: string }> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000';
  const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const headers = { apikey: SR, Authorization: `Bearer ${SR}` };
  const get = async (path: string): Promise<any[]> => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    } catch {
      return [];
    }
  };

  const slug = String(slugRaw ?? '').trim();
  let tenantId: string | null = payload.tenant_id ?? null;
  if (slug) {
    const rows = await get(`gw_tenants?slug=eq.${encodeURIComponent(slug)}&select=id&limit=1`);
    tenantId = rows[0]?.id ?? null; // unknown slug → null; caller rejects
  }
  if (!tenantId) return { tenantId: null, tenantRole: '' };

  let tenantRole = payload.tenant_id === tenantId ? String(payload.tenant_role ?? '') : '';
  if (!tenantRole && payload.sub) {
    const [members, profiles] = await Promise.all([
      get(`gw_tenant_members?tenant_id=eq.${tenantId}&user_id=eq.${payload.sub}&select=role&limit=1`),
      get(`gw_profiles?user_id=eq.${payload.sub}&select=is_super_admin&limit=1`),
    ]);
    tenantRole = profiles[0]?.is_super_admin ? 'super_admin' : (members[0]?.role ?? '');
  }
  return { tenantId, tenantRole };
}

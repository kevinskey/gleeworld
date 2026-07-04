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

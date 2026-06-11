import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_ROLES = ['admin', 'super-admin', 'executive'];

export interface Caller {
  internal: boolean;
  userId?: string;
  isAdmin?: boolean;
}

// Returns { internal: true } for service-role callers, { userId, isAdmin } for
// valid user JWTs, or null when unauthenticated. FUNCTIONS_VERIFY_JWT is false
// in production, so this is the only auth gate edge functions have.
export async function authenticateCaller(req: Request): Promise<Caller | null> {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  if (token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    return { internal: true };
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return null;

  const { data: profile } = await supabase
    .from('gw_profiles')
    .select('role, is_admin, is_super_admin')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  const isAdmin = !!(profile?.is_admin || profile?.is_super_admin || ADMIN_ROLES.includes(profile?.role || ''));
  return { internal: false, userId: userData.user.id, isAdmin };
}

export function unauthorizedResponse(corsHeaders: Record<string, string>, status = 401): Response {
  return new Response(
    JSON.stringify({ error: status === 403 ? 'Admin role required' : 'Unauthorized' }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Admin Delete User Edge Function
// Deletes a user from Auth and cleans up primary profile links.
// Requires caller to be admin/super-admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing bearer token' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Verify caller
    const { data: userData, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const callerId = userData.user.id;
    const { data: profile, error: profileErr } = await supabase
      .from('gw_profiles')
      .select('is_admin, is_super_admin, role')
      .eq('user_id', callerId)
      .maybeSingle();

    if (profileErr) {
      console.error('Profile fetch error:', profileErr);
      return new Response(JSON.stringify({ error: 'Profile lookup failed' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const isAdmin = !!(profile?.is_admin || profile?.is_super_admin || profile?.role === 'admin' || profile?.role === 'super-admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const { target_user_id } = await req.json().catch(() => ({ target_user_id: undefined }));
    if (!target_user_id) {
      return new Response(JSON.stringify({ error: 'target_user_id is required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    if (target_user_id === callerId) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // 1) Try deleting from Auth (treat 404 as OK)
    let authDeleted = false;
    try {
      const { error: delErr } = await supabase.auth.admin.deleteUser(target_user_id);
      if (delErr) {
        // If the user is already gone, continue cleanup
        if ((delErr as any)?.status === 404 || (delErr as any)?.message?.includes('user_not_found')) {
          authDeleted = false;
        } else {
          console.warn('Auth delete returned error, proceeding with cleanup anyway:', delErr);
        }
      } else {
        authDeleted = true;
      }
    } catch (e) {
      console.warn('Auth delete threw, proceeding with cleanup:', e);
    }

    // 2) Clean up key app records (service role bypasses RLS)
    const deletes = [] as Promise<any>[];

    // Executive board entries
    deletes.push(
      supabase.from('gw_executive_board_members').delete().eq('user_id', target_user_id)
    );

    // Profiles
    deletes.push(
      supabase.from('gw_profiles').delete().eq('user_id', target_user_id)
    );

    // Optional: activity logs (non-blocking)
    deletes.push(
      supabase.from('activity_logs').delete().eq('user_id', target_user_id)
    );

    const results = await Promise.allSettled(deletes);
    const cleanupErrors = results.filter(r => r.status === 'rejected');

    // 3) Return summary
    return new Response(
      JSON.stringify({
        success: true,
        authDeleted,
        cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('admin-delete-user error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message || 'Unexpected error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});

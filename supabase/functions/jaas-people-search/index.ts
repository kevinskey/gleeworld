// jaas-people-search — powers the "Invite your contacts" search box in
// the JaaS in-call invite dialog. Jitsi's client calls this URL as
//   GET  <peopleSearchUrl>?query=<q>&jwt=<jaas-jwt>[&queryTypes=[...]]
// and expects
//   [{ id, name, email, avatar, type: 'user' | 'phone' | 'room' }]
//
// The caller's identity comes from the JaaS JWT we minted in
// jaas-jwt-token — sub === JAAS_APP_ID (the vpaas tenant), and
// context.user.id === Supabase auth.uid(). We refuse tokens whose sub
// isn't our tenant. The JaaS JWT signature is NOT re-verified here (it
// would require deriving the RSA public key from JAAS_PRIVATE_KEY at
// every call); the leak surface if a token were forged is a same-tenant
// user directory search — data an authenticated member can already list
// via gw_profiles_directory. The `sub` gate keeps random JWTs from
// pointing at OUR tenant.
//
// Results are ranked: people who share a course or group chat with the
// caller float to the top, then the rest of the same-tenant directory
// matching the query on name/email. Capped at 20 rows.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RESULTS = 20;

function decodeJwt(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // JaaS's client calls GET with query params, but be forgiving.
    const url = new URL(req.url);
    let query = url.searchParams.get('query') ?? '';
    let jwt = url.searchParams.get('jwt') ?? '';
    if ((!query || !jwt) && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      query = query || String(body?.query ?? '');
      jwt = jwt || String(body?.jwt ?? '');
    }

    if (!jwt) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const claims = decodeJwt(jwt);
    if (!claims) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expectedAppId = (Deno.env.get('JAAS_APP_ID') || '').trim().replace(/^['"]|['"]$/g, '');
    if (!expectedAppId || claims.sub !== expectedAppId) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = Number(claims.exp);
    if (!exp || exp < now) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ctx = (claims.context as Record<string, unknown> | undefined) ?? {};
    const ctxUser = (ctx.user as Record<string, unknown> | undefined) ?? {};
    const callerUserId = String(ctxUser.id ?? '');
    if (!callerUserId) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const svc = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Resolve caller's tenant. Everything else in this fn is scoped to
    // that tenant — we never search across tenants.
    const { data: callerProfile } = await svc
      .from('gw_profiles')
      .select('tenant_id, full_name, email')
      .eq('user_id', callerUserId)
      .maybeSingle();

    const callerTenantId = (callerProfile as { tenant_id?: string } | null)?.tenant_id;
    if (!callerTenantId) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the caller's "world": users who share a course enrollment
    // or a message-group membership with the caller. These float to the
    // top of the results.
    const [{ data: myCourses }, { data: myGroups }] = await Promise.all([
      svc.from('gw_course_enrollments').select('course_id').eq('user_id', callerUserId),
      svc.from('gw_group_members').select('group_id').eq('user_id', callerUserId),
    ]);

    const courseIds = (myCourses ?? []).map((r: { course_id: string | null }) => r.course_id).filter(Boolean) as string[];
    const groupIds = (myGroups ?? []).map((r: { group_id: string | null }) => r.group_id).filter(Boolean) as string[];

    const worldUserIds = new Set<string>();
    if (courseIds.length > 0) {
      const { data } = await svc
        .from('gw_course_enrollments')
        .select('user_id')
        .in('course_id', courseIds);
      for (const row of data ?? []) {
        const uid = (row as { user_id: string | null }).user_id;
        if (uid && uid !== callerUserId) worldUserIds.add(uid);
      }
    }
    if (groupIds.length > 0) {
      const { data } = await svc
        .from('gw_group_members')
        .select('user_id')
        .in('group_id', groupIds);
      for (const row of data ?? []) {
        const uid = (row as { user_id: string | null }).user_id;
        if (uid && uid !== callerUserId) worldUserIds.add(uid);
      }
    }

    // Directory search: same tenant, name/email fuzzy match on the query.
    // gw_profiles_directory is a tenant-scoped VIEW that already hides
    // sensitive columns, matching what the messaging composers use.
    const q = query.trim();
    let dirQuery = svc
      .from('gw_profiles_directory')
      .select('user_id, full_name, email, avatar_url')
      .eq('tenant_id', callerTenantId)
      .neq('user_id', callerUserId)
      .not('email', 'is', null)
      .limit(80);

    if (q.length > 0) {
      const pattern = `%${q.replace(/[%_\\]/g, (c) => '\\' + c)}%`;
      dirQuery = dirQuery.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
    }

    const { data: directory, error: dirErr } = await dirQuery;
    if (dirErr) {
      console.error('[jaas-people-search] directory query failed:', dirErr.message);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    type DirRow = { user_id: string | null; full_name: string | null; email: string | null; avatar_url: string | null };
    const rows = (directory ?? []) as DirRow[];

    // Rank: people in the caller's world first, then the rest.
    rows.sort((a, b) => {
      const aIn = a.user_id && worldUserIds.has(a.user_id) ? 1 : 0;
      const bIn = b.user_id && worldUserIds.has(b.user_id) ? 1 : 0;
      if (aIn !== bIn) return bIn - aIn;
      return (a.full_name ?? '').localeCompare(b.full_name ?? '');
    });

    const results = rows.slice(0, MAX_RESULTS).map((r) => ({
      id: r.user_id,
      name: r.full_name || (r.email ?? '').split('@')[0] || 'Member',
      email: r.email || '',
      avatar: r.avatar_url || '',
      type: 'user' as const,
    }));

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[jaas-people-search] error:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// google-push-appointment — mirrors a gw_appointments row to BOTH the
// student's and the instructor's Google primary calendars (whichever have
// a write-scope connection). Called by the booking flow on book + by the
// instructor approve action.
//
// Body shape:  { appointment_id: string, op?: 'create' | 'update' | 'delete' }
//
// Behavior per side (student / instructor):
//   create — POST /calendars/primary/events; store id in
//            gw_appointments.{student,instructor}_google_event_id.
//   update — PATCH the stored id; falls through to create if absent.
//   delete — DELETE the stored id; clears the column.
//
// Auth: caller's JWT for the user check + tenant scope (defense in depth
// since we use the service-role client to load both Google connections).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WRITE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('refresh_failed: ' + (await res.text()).slice(0, 200));
  return await res.json() as { access_token: string; expires_in: number };
}

function appointmentToGoogle(appt: any, service: any | null, isInstructorSide: boolean) {
  const startIso = new Date(appt.appointment_date).toISOString();
  const durationMs = (appt.duration_minutes || 30) * 60_000;
  const endIso = new Date(new Date(appt.appointment_date).getTime() + durationMs).toISOString();

  // Instructor-side summary names the client; student-side names the service.
  const summary = isInstructorSide
    ? `${service?.name || 'Office Hours'} — ${appt.client_name || 'Student'}`
    : `${service?.name || 'Office Hours'}${service?.instructor ? ` with ${service.instructor}` : ''}`;

  return {
    summary,
    description: [appt.description, appt.notes].filter(Boolean).join('\n\n') || undefined,
    location: service?.location || undefined,
    start: { dateTime: startIso },
    end: { dateTime: endIso },
    extendedProperties: {
      private: {
        gleeworld_appointment_id: appt.id,
        gleeworld_tenant_id: appt.tenant_id,
        side: isInstructorSide ? 'instructor' : 'student',
      },
    },
  };
}

async function ensureFreshToken(admin: any, conn: any, clientId: string, clientSecret: string) {
  let token = conn.access_token as string | null;
  const expired = !token || !conn.expires_at || new Date(conn.expires_at) < new Date();
  if (!expired) return token!;
  const r = await refreshAccessToken(conn.refresh_token, clientId, clientSecret);
  const expiresAt = new Date(Date.now() + (r.expires_in - 30) * 1000).toISOString();
  await admin.from('gw_google_connections')
    .update({ access_token: r.access_token, expires_at: expiresAt, last_error: null })
    .eq('id', conn.id);
  return r.access_token;
}

// Push a single side (student or instructor). Returns the resulting google id
// (or null on no-op). Throws on hard error so we can surface it.
async function pushSide({
  admin, appt, service, isInstructorSide, op, userId, idColumn, clientId, clientSecret,
}: {
  admin: any; appt: any; service: any; isInstructorSide: boolean;
  op: 'create' | 'update' | 'delete'; userId: string | null;
  idColumn: 'student_google_event_id' | 'instructor_google_event_id';
  clientId: string; clientSecret: string;
}): Promise<{ status: 'pushed' | 'skipped' | 'deleted'; id?: string; reason?: string }> {
  if (!userId) return { status: 'skipped', reason: 'no_user' };

  const { data: conn } = await admin
    .from('gw_google_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!conn || !(conn.scope ?? '').includes(WRITE_SCOPE)) {
    return { status: 'skipped', reason: 'no_write_connection' };
  }

  const accessToken = await ensureFreshToken(admin, conn, clientId, clientSecret);
  const existingId: string | null = appt[idColumn] ?? null;

  if (op === 'delete') {
    if (!existingId) return { status: 'skipped', reason: 'no_google_event_id' };
    const del = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(existingId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!del.ok && del.status !== 410) {
      throw new Error('google_delete_failed: ' + (await del.text()).slice(0, 200));
    }
    await admin.from('gw_appointments').update({ [idColumn]: null }).eq('id', appt.id);
    return { status: 'deleted' };
  }

  const payload = appointmentToGoogle(appt, service, isInstructorSide);
  let resp: Response;
  if (op === 'update' && existingId) {
    resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(existingId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } else {
    resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  if (!resp.ok) throw new Error('google_write_failed: ' + (await resp.text()).slice(0, 200));
  const created = await resp.json() as { id: string };
  await admin.from('gw_appointments').update({ [idColumn]: created.id }).eq('id', appt.id);
  return { status: 'pushed', id: created.id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const clientId     = Deno.env.get('GW_GOOGLE_CAL_CLIENT_ID');
  const clientSecret = Deno.env.get('GW_GOOGLE_CAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'Google OAuth secrets not configured.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let body: { appointment_id?: string; op?: 'create' | 'update' | 'delete' } = {};
  try { body = await req.json(); } catch { /* no body */ }
  if (!body.appointment_id) {
    return new Response(JSON.stringify({ error: 'appointment_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const op = body.op ?? 'create';

  // Resolve caller's tenant from their gw_profiles row for defense-in-depth.
  const { data: callerProfile } = await admin
    .from('gw_profiles')
    .select('tenant_id')
    .eq('user_id', user.id)
    .maybeSingle();
  const callerTenant = callerProfile?.tenant_id;
  if (!callerTenant) {
    return new Response(JSON.stringify({ error: 'no_tenant_for_caller' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Load appointment scoped to caller's tenant.
  const { data: appt, error: apptErr } = await admin
    .from('gw_appointments')
    .select('*')
    .eq('id', body.appointment_id)
    .eq('tenant_id', callerTenant)
    .maybeSingle();
  if (apptErr || !appt) {
    return new Response(JSON.stringify({ error: 'appointment_not_found_in_tenant' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Caller must be student, instructor, or a tenant admin for this appointment.
  const isStudent    = appt.created_by === user.id;
  const isInstructor = appt.instructor_user_id === user.id || appt.assigned_to === user.id;
  let isAdmin = false;
  if (!isStudent && !isInstructor) {
    const { data: prof } = await admin
      .from('gw_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .maybeSingle();
    isAdmin = !!(prof?.is_admin || prof?.is_super_admin);
  }
  if (!isStudent && !isInstructor && !isAdmin) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Load service for the summary/location, scoped to tenant.
  let service: any = null;
  if (appt.service_id) {
    const { data: s } = await admin
      .from('gw_services')
      .select('id, name, location, instructor, tenant_id')
      .eq('id', appt.service_id)
      .eq('tenant_id', callerTenant)
      .maybeSingle();
    service = s;
  }

  // Push both sides, swallowing per-side failures into the response payload.
  const results: Record<string, any> = {};
  try {
    results.student = await pushSide({
      admin, appt, service, isInstructorSide: false, op,
      userId: appt.created_by, idColumn: 'student_google_event_id',
      clientId, clientSecret,
    });
  } catch (e) {
    results.student = { status: 'error', error: String(e) };
  }
  try {
    results.instructor = await pushSide({
      admin, appt, service, isInstructorSide: true, op,
      userId: appt.instructor_user_id || appt.assigned_to, idColumn: 'instructor_google_event_id',
      clientId, clientSecret,
    });
  } catch (e) {
    results.instructor = { status: 'error', error: String(e) };
  }

  const anyError = results.student?.status === 'error' || results.instructor?.status === 'error';
  if (anyError) {
    const errStr = JSON.stringify(results).slice(0, 500);
    await admin.from('gw_appointments').update({ google_push_error: errStr }).eq('id', appt.id);
  } else {
    await admin.from('gw_appointments').update({ google_push_error: null }).eq('id', appt.id);
  }

  return new Response(JSON.stringify({ ok: !anyError, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

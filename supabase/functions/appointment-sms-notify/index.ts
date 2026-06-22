// appointment-sms-notify — sends SMS to the student and the instructor on
// appointment lifecycle events. Replaces the legacy office-hours-notify
// (which was hardcoded to Dr. Johnson + the hosted Supabase URL).
//
// Body shape: { appointment_id: string, event: 'created' | 'confirmed' | 'cancelled' | 'updated' }
//
// Behavior:
//   created   → student gets "request submitted", instructor gets a request alert
//   confirmed → student gets confirmation, instructor gets a calendar reminder
//   cancelled → both sides get a cancellation notice
//   updated   → both sides get a "changed" notice
//
// Twilio credentials are read from TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
// TWILIO_PHONE_NUMBER. Failures per-recipient are returned in the response
// but never throw.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Event = 'created' | 'confirmed' | 'cancelled' | 'updated';

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('1') && digits.length === 11) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  if (digits.startsWith('+')) return digits;
  return '+' + digits;
}

function formatDate(appointmentDate: string, durationMin: number) {
  const start = new Date(appointmentDate);
  const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' });
  const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
  return { dateStr, timeStr, durationMin };
}

function buildMessages(event: Event, ctx: {
  serviceName: string;
  studentName: string;
  instructorName: string;
  dateStr: string;
  timeStr: string;
  topic?: string;
}): { student?: string; instructor?: string } {
  const tail = `${ctx.dateStr} at ${ctx.timeStr}`;
  switch (event) {
    case 'created':
      return {
        student: `GleeWorld: Your "${ctx.serviceName}" request is in. ${tail}. You'll hear back once ${ctx.instructorName || 'your instructor'} confirms.`,
        instructor: `GleeWorld: New "${ctx.serviceName}" request from ${ctx.studentName} for ${tail}.${ctx.topic ? ` Topic: ${ctx.topic}.` : ''}`,
      };
    case 'confirmed':
      return {
        student: `GleeWorld: Your "${ctx.serviceName}" with ${ctx.instructorName || 'your instructor'} is confirmed for ${tail}.`,
        instructor: `GleeWorld: "${ctx.serviceName}" with ${ctx.studentName} is confirmed for ${tail}.`,
      };
    case 'cancelled':
      return {
        student: `GleeWorld: Your "${ctx.serviceName}" on ${tail} has been cancelled.`,
        instructor: `GleeWorld: "${ctx.serviceName}" with ${ctx.studentName} on ${tail} has been cancelled.`,
      };
    case 'updated':
      return {
        student: `GleeWorld: Your "${ctx.serviceName}" was updated — now ${tail}.`,
        instructor: `GleeWorld: "${ctx.serviceName}" with ${ctx.studentName} was updated — now ${tail}.`,
      };
  }
}

async function sendTwilio(to: string, body: string, sid: string, token: string, from: string) {
  const auth = btoa(`${sid}:${token}`);
  const form = new URLSearchParams({ To: to, From: from, Body: body });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text.slice(0, 200));
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const twilioSid   = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFrom  = Deno.env.get('TWILIO_PHONE_NUMBER');
  if (!twilioSid || !twilioToken || !twilioFrom) {
    return new Response(JSON.stringify({ error: 'twilio_not_configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let body: { appointment_id?: string; event?: Event } = {};
  try { body = await req.json(); } catch { /* */ }
  if (!body.appointment_id || !body.event) {
    return new Response(JSON.stringify({ error: 'appointment_id and event are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Tenant scope from caller's profile.
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
    .select('id, tenant_id, title, description, appointment_date, duration_minutes, status, client_name, client_phone, client_email, notes, created_by, instructor_user_id, assigned_to, service_id')
    .eq('id', body.appointment_id)
    .eq('tenant_id', callerTenant)
    .maybeSingle();
  if (apptErr || !appt) {
    return new Response(JSON.stringify({ error: 'appointment_not_found_in_tenant' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Load service for the service name.
  let serviceName = 'Office Hours';
  if (appt.service_id) {
    const { data: s } = await admin
      .from('gw_services')
      .select('name')
      .eq('id', appt.service_id)
      .eq('tenant_id', callerTenant)
      .maybeSingle();
    if (s?.name) serviceName = s.name;
  }

  const instructorUserId: string | null = appt.instructor_user_id || appt.assigned_to;

  // Find instructor profile (phone + name)
  let instructorPhone: string | null = null;
  let instructorName = '';
  if (instructorUserId) {
    const { data: prof } = await admin
      .from('gw_profiles')
      .select('full_name, phone_number, phone')
      .eq('user_id', instructorUserId)
      .maybeSingle();
    instructorPhone = normalizePhone(prof?.phone_number || prof?.phone);
    instructorName  = prof?.full_name || '';
  }

  // Student phone — prefer the one stored on the appointment, fall back to
  // their profile.
  let studentPhone: string | null = normalizePhone(appt.client_phone);
  if (!studentPhone && appt.created_by) {
    const { data: prof } = await admin
      .from('gw_profiles')
      .select('phone_number, phone')
      .eq('user_id', appt.created_by)
      .maybeSingle();
    studentPhone = normalizePhone(prof?.phone_number || prof?.phone);
  }

  const { dateStr, timeStr } = formatDate(appt.appointment_date, appt.duration_minutes || 30);
  const topic = appt.description || appt.notes || undefined;
  const msgs = buildMessages(body.event, {
    serviceName,
    studentName: appt.client_name || 'Student',
    instructorName,
    dateStr, timeStr, topic,
  });

  const results: Record<string, any> = {};

  if (studentPhone && msgs.student) {
    try {
      await sendTwilio(studentPhone, msgs.student, twilioSid, twilioToken, twilioFrom);
      results.student = { status: 'sent', to: studentPhone };
    } catch (e) {
      results.student = { status: 'error', to: studentPhone, error: String(e) };
    }
  } else {
    results.student = { status: 'skipped', reason: studentPhone ? 'no_message' : 'no_phone' };
  }

  if (instructorPhone && msgs.instructor) {
    try {
      await sendTwilio(instructorPhone, msgs.instructor, twilioSid, twilioToken, twilioFrom);
      results.instructor = { status: 'sent', to: instructorPhone };
    } catch (e) {
      results.instructor = { status: 'error', to: instructorPhone, error: String(e) };
    }
  } else {
    results.instructor = { status: 'skipped', reason: instructorPhone ? 'no_message' : 'no_phone' };
  }

  return new Response(JSON.stringify({ ok: true, event: body.event, results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

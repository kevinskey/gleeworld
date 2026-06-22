// ical-feed — emits a per-user iCalendar (RFC 5545) feed of their GleeWorld
// events so they can subscribe from Google / Apple / Outlook.
//
// Auth model: token-in-URL (the standard for private iCal feeds — Google
// Calendar's "Secret address in iCal format" works the same way). The token
// lives on gw_profiles.ical_feed_token (uuid, unique). Rotating the token
// in the user's profile invalidates every existing subscription URL.
//
// Multi-tenant safety: we look up the token → user_id → tenant_id once, then
// query gw_events scoped to that tenant. We deliberately use the service-role
// client because the public feed has no JWT, but we manually re-impose the
// tenant scope on every query so cross-tenant leakage is impossible.
//
// Endpoint:
//   GET /functions/v1/ical-feed?token=<uuid>
// Returns:
//   200 text/calendar; charset=utf-8   — the .ics feed
//   404                                — token not recognised

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Wrap long property lines per RFC 5545 §3.1 (folding at 75 octets).
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    out.push((i === 0 ? '' : ' ') + line.slice(i, i + (i === 0 ? 75 : 74)));
    i += i === 0 ? 75 : 74;
  }
  return out.join('\r\n');
}

// iCal escaping — backslash, semicolon, comma, newline.
function esc(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// ISO → iCal UTC datetime (20260614T180000Z).
function toICalUTC(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? url.pathname.split('/').pop();

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return new Response('Bad token', { status: 400 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // Look up the user by their feed token.
  const { data: profile, error: profErr } = await admin
    .from('gw_profiles')
    .select('user_id, tenant_id, full_name, email')
    .eq('ical_feed_token', token)
    .maybeSingle();

  if (profErr || !profile) {
    return new Response('Feed not found', { status: 404 });
  }

  // Pull every event in the caller's tenant. We re-impose tenant_id here
  // because the service-role client bypasses RLS. Future iterations can
  // narrow this by role-based visibility (instructors → their courses, etc.).
  const { data: events, error: eventsErr } = await admin
    .from('gw_events')
    .select('id, title, description, start_date, end_date, location, venue_name, updated_at, created_at')
    .eq('tenant_id', profile.tenant_id)
    .order('start_date', { ascending: true })
    .limit(2000);

  if (eventsErr) {
    return new Response('Feed error: ' + eventsErr.message, { status: 500 });
  }

  const now = toICalUTC(new Date().toISOString());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GleeWorld//Calendar Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold('X-WR-CALNAME:' + esc(`GleeWorld — ${profile.full_name || profile.email || 'My calendar'}`)),
    'X-WR-TIMEZONE:America/New_York',
  ];

  for (const ev of events ?? []) {
    const start = toICalUTC(ev.start_date);
    if (!start) continue;
    const end = toICalUTC(ev.end_date) || start;
    const where = [ev.venue_name, ev.location].filter(Boolean).join(', ');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@gleeworld.org`);
    lines.push(`DTSTAMP:${toICalUTC(ev.updated_at || ev.created_at || ev.start_date)}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(fold('SUMMARY:' + esc(ev.title || '(untitled)')));
    if (ev.description) lines.push(fold('DESCRIPTION:' + esc(ev.description)));
    if (where) lines.push(fold('LOCATION:' + esc(where)));
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return new Response(lines.join('\r\n') + '\r\n', {
    status: 200,
    headers: {
      // text/calendar is the official MIME for .ics; charset=utf-8 prevents
      // mojibake on non-ASCII event titles.
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
      // Filename hint when downloaded as an attachment rather than subscribed.
      'Content-Disposition': 'inline; filename="gleeworld.ics"',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

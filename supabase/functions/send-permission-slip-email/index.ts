// supabase/functions/send-permission-slip-email/index.ts
//
// POST /functions/v1/send-permission-slip-email
// Body: { slip_id: string, link_host?: string }
//   slip_id   — UUID of the gw_permission_slips row
//   link_host — origin the guardian link should point to
//               (e.g. "https://demo.gleeworld.org"). Falls back to
//               PARENT_LINK_HOST_BASE env var. Sending teacher UI should
//               pass window.location.origin so the link lands on the
//               correct tenant SPA, not on supabase.gleeworld.org.
//
// Response: 200 { ok: true, sent_to: string }
//         | 400 { error: 'slip_id required' | 'missing_guardian' }
//         | 401 { error: 'unauthorized' }
//         | 403 { error: 'unauthorized' }
//         | 502 { error: 'email_failed' }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyJwtClaims } from '../_shared/verifyJwt.ts';
import { signSlipToken } from '../_shared/permissionSlipToken.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
// Fallback host for the magic link when link_host is not in the request body.
// Set to the tenant SPA origin, e.g. "https://demo.gleeworld.org".
const FALLBACK_LINK_HOST = (Deno.env.get('PARENT_LINK_HOST_BASE') ?? '').replace(/\/$/, '');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors() });
  }

  // --- Auth: verify the caller's JWT signature (never trust bare atob) ---
  const rawToken = (req.headers.get('authorization') ?? '').replace(/^bearer\s+/i, '');
  if (!rawToken) return json(401, { error: 'unauthorized' });

  const claims = await verifyJwtClaims(rawToken);
  if (!claims) return json(401, { error: 'unauthorized' });

  // --- Parse body ---
  let body: { slip_id?: string; link_host?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'slip_id required' });
  }
  const { slip_id, link_host } = body;
  if (!slip_id) return json(400, { error: 'slip_id required' });

  // Determine the tenant-SPA origin for the magic link.
  // 1. Prefer link_host from request body (teacher UI passes window.location.origin).
  // 2. Fall back to PARENT_LINK_HOST_BASE env var.
  // Do NOT use new URL(req.url).origin — that resolves to supabase.gleeworld.org.
  const linkHost = (link_host ?? FALLBACK_LINK_HOST).replace(/\/$/, '');

  // --- Fetch slip via a user-scoped client so RLS rejects non-teachers ---
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${rawToken}` } },
  });

  const { data: slip, error: slipErr } = await userClient
    .from('gw_permission_slips')
    .select(`
      id,
      tenant_id,
      student_user_id,
      status,
      tour:tour_id (
        id,
        title,
        start_date,
        location
      )
    `)
    .eq('id', slip_id)
    .single();

  if (slipErr || !slip) return json(403, { error: 'unauthorized' });

  // --- Resolve student display name via auth.users metadata (service role) ---
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: studentAuth } = await admin.auth.admin.getUserById(slip.student_user_id);
  const studentName: string =
    (studentAuth?.user?.user_metadata?.full_name as string | undefined) ??
    studentAuth?.user?.email ??
    'your student';

  // --- Fetch guardians (service role; RLS on guardians requires teacher ctx we can't rely on) ---
  const { data: guardians } = await admin
    .from('gw_guardians')
    .select('id, name, email, is_primary')
    .eq('student_user_id', slip.student_user_id)
    .eq('tenant_id', slip.tenant_id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  const primary = (guardians ?? [])[0];
  if (!primary) return json(400, { error: 'missing_guardian' });
  const cc = (guardians ?? []).slice(1).map((g: { email: string }) => g.email);

  // --- Mint a signed magic-link token ---
  const jti = crypto.randomUUID();
  const token = await signSlipToken({
    slipId: slip.id,
    guardianId: primary.id,
    tenantId: slip.tenant_id,
    jti,
  });

  // Construct the link pointing to the tenant SPA.
  const link = `${linkHost}/parent/permission-slip?token=${token}`;

  // --- Stamp the slip: status='sent', jti, timestamps ---
  await admin
    .from('gw_permission_slips')
    .update({
      slip_token_jti: jti,
      sent_to_guardian_id: primary.id,
      sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 864e5).toISOString(),
      status: 'sent',
    })
    .eq('id', slip.id);

  // --- Build email ---
  const tour = slip.tour as unknown as { title: string; start_date: string; location: string } | null;
  const tripTitle = tour?.title ?? 'Upcoming Travel Event';
  const tripDate  = tour?.start_date
    ? new Date(tour.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const tripLocation = tour?.location ?? '';

  const subject = `Permission slip: ${tripTitle}`;
  const html = buildEmailHtml({
    guardianName: primary.name,
    studentName,
    tripTitle,
    tripDate,
    tripLocation,
    link,
  });

  // --- Send via gw-send-email (service-role caller accepted) ---
  const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/gw-send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // gw-send-email accepts service-role key as a trusted caller
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      to: primary.email,
      cc: cc.length ? cc : undefined,
      subject,
      html,
    }),
  });

  if (!emailRes.ok) {
    const errBody = await emailRes.text().catch(() => '');
    console.error('gw-send-email failed:', emailRes.status, errBody);
    return json(502, { error: 'email_failed' });
  }

  return json(200, { ok: true, sent_to: primary.email });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  });
}

/** Minimal HTML escape — never trust user-supplied strings in email bodies. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function buildEmailHtml(p: {
  guardianName: string;
  studentName: string;
  tripTitle: string;
  tripDate: string;
  tripLocation: string;
  link: string;
}): string {
  const dateLocLine = [p.tripDate, p.tripLocation].filter(Boolean).join(' · ');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
  <p>Hi ${esc(p.guardianName)},</p>
  <p>
    <strong>${esc(p.studentName)}</strong> has been added to the upcoming travel event
    <strong>${esc(p.tripTitle)}</strong>${dateLocLine ? ` (${esc(dateLocLine)})` : ''}.
    Please review the trip details and complete the permission slip by clicking the button below.
  </p>
  <p style="margin:32px 0">
    <a href="${p.link}"
       style="background:#111;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
      Open Permission Slip
    </a>
  </p>
  <p style="color:#555;font-size:13px">
    This link is personal to you and expires in 14 days. If it stops working, contact your student's
    teacher for a new one. Do not forward this email — the link is tied to your guardian record.
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#999;font-size:11px">Sent via GleeWorld Travel Manager</p>
</body>
</html>`;
}

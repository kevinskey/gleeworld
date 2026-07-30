// supabase/functions/verify-permission-slip-token/index.ts
//
// POST /functions/v1/verify-permission-slip-token
// PUBLIC endpoint (no auth required) — accepts a magic-link token and returns slip + trip details.
//
// Body: { token: string }
//   token — JWT signed by the _shared/permissionSlipToken module
//
// Response: 200 { ok: true, slip: { id, status }, student: { full_name }, guardian: { name, email }, trip: { title, location, start_date, end_date, description } }
//         | 200 { ok: false, reason: 'invalid' | 'expired' | 'revoked' | 'already_signed' }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifySlipToken } from '../_shared/permissionSlipToken.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors() });
  }

  // --- Parse body ---
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid' });
  }
  const { token } = body;
  if (!token) return json({ ok: false, reason: 'invalid' });

  // --- Verify JWT signature ---
  let claims;
  try {
    claims = await verifySlipToken(token);
  } catch {
    return json({ ok: false, reason: 'invalid' });
  }

  // --- Admin client to fetch slip + data (no RLS) ---
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: slip, error: slipErr } = await admin
    .from('gw_permission_slips')
    .select('id, status, slip_token_jti, tour_id, student_user_id')
    .eq('id', claims.slipId)
    .single();

  if (slipErr || !slip) return json({ ok: false, reason: 'invalid' });

  // --- Check revocation: jti mismatch ---
  if (slip.slip_token_jti !== claims.jti) {
    return json({ ok: false, reason: 'revoked' });
  }

  // --- Check status ---
  if (slip.status === 'signed') return json({ ok: false, reason: 'already_signed' });
  if (slip.status === 'revoked') return json({ ok: false, reason: 'revoked' });
  if (slip.status === 'expired') return json({ ok: false, reason: 'expired' });

  // --- Fetch guardian, student, and tour in parallel ---
  const [guardianRes, studentAuthRes, tourRes] = await Promise.all([
    admin.from('gw_guardians').select('name, email').eq('id', claims.guardianId).single(),
    admin.auth.admin.getUserById(slip.student_user_id),
    admin
      .from('gw_tour_events')
      .select('title, location, start_date, end_date, description')
      .eq('id', slip.tour_id)
      .single(),
  ]);

  const { data: guardian, error: guardianErr } = guardianRes;
  const { data: tourEvent, error: tourErr } = tourRes;
  const { data: { user: studentUser }, error: studentErr } = studentAuthRes;

  if (guardianErr || !guardian || studentErr || !studentUser || tourErr || !tourEvent) {
    return json({ ok: false, reason: 'invalid' });
  }

  const studentName = (studentUser.user_metadata?.full_name as string | undefined) || studentUser.email || 'Student';

  return json({
    ok: true,
    slip: { id: slip.id, status: slip.status },
    student: { full_name: studentName },
    guardian: { name: guardian.name, email: guardian.email },
    trip: {
      title: tourEvent.title,
      location: tourEvent.location,
      start_date: tourEvent.start_date,
      end_date: tourEvent.end_date,
      description: tourEvent.description,
    },
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...cors() },
  });
}

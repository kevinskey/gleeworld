// supabase/functions/parent-sign-permission-slip/index.ts
//
// POST /functions/v1/parent-sign-permission-slip
// PUBLIC endpoint (no auth required) — accepts parent signature and marks slip as signed.
//
// Body: { token: string, signature_png_base64: string, typed_name: string }
//   token                   — JWT signed by the _shared/permissionSlipToken module
//   signature_png_base64    — Base64-encoded PNG of the parent's signature
//   typed_name              — Full name typed by the parent
//
// Response: 200 { ok: true }
//         | 200 { ok: false, reason: 'bad_request' | 'invalid' | 'revoked' | 'already_signed' | 'upload_failed' | 'update_failed' }

import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifySlipToken } from '../_shared/permissionSlipToken.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors() });
  }

  // --- Extract IP from x-forwarded-for header (take first if comma-separated) ---
  const xForwardedFor = req.headers.get('x-forwarded-for') ?? '';
  const ip = xForwardedFor.split(',')[0]?.trim() || '';
  const ua = req.headers.get('user-agent') ?? '';

  // --- Parse body ---
  let body: { token?: string; signature_png_base64?: string; typed_name?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'bad_request' });
  }

  const { token, signature_png_base64, typed_name } = body;

  // --- Validate required fields ---
  if (!token || !signature_png_base64 || !typed_name) {
    return json({ ok: false, reason: 'bad_request' });
  }

  // --- Verify JWT signature ---
  let claims;
  try {
    claims = await verifySlipToken(token);
  } catch {
    return json({ ok: false, reason: 'invalid' });
  }

  // --- Admin client to fetch slip and update it ---
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // --- Fetch slip to verify status and jti ---
  const { data: slip, error: slipErr } = await admin
    .from('gw_permission_slips')
    .select('id, status, slip_token_jti, tenant_id')
    .eq('id', claims.slipId)
    .single();

  if (slipErr || !slip) {
    return json({ ok: false, reason: 'invalid' });
  }

  // --- Check revocation: jti mismatch ---
  if (slip.slip_token_jti !== claims.jti) {
    return json({ ok: false, reason: 'revoked' });
  }

  // --- Check status: must be 'sent' to sign ---
  if (slip.status !== 'sent') {
    return json({ ok: false, reason: 'already_signed' });
  }

  // --- Decode PNG from base64 ---
  let bytes: Uint8Array;
  try {
    const cleanedBase64 = signature_png_base64.replace(/^data:image\/png;base64,/, '');
    bytes = Uint8Array.from(atob(cleanedBase64), (c) => c.charCodeAt(0));
  } catch {
    return json({ ok: false, reason: 'bad_request' });
  }

  // --- Upload PNG to storage ---
  const path = `${slip.tenant_id}/${slip.id}.png`;
  const uploadRes = await admin.storage.from('permission-slips').upload(path, bytes, {
    contentType: 'image/png',
    upsert: true,
  });

  if (uploadRes.error) {
    console.error('Storage upload failed:', uploadRes.error);
    return json({ ok: false, reason: 'upload_failed' });
  }

  // --- Build signature audit record ---
  const now = new Date().toISOString();
  const signatureAudit = {
    ip,
    user_agent: ua,
    typed_name,
    ts: now,
  };

  // --- Update slip with idempotency check on jti ---
  const { error: updateErr } = await admin
    .from('gw_permission_slips')
    .update({
      status: 'signed',
      signed_by_guardian_id: claims.guardianId,
      signed_at: now,
      signature_storage_path: path,
      signature_audit: signatureAudit,
    })
    .eq('id', slip.id)
    .eq('slip_token_jti', claims.jti);

  if (updateErr) {
    console.error('Slip update failed:', updateErr);
    return json({ ok: false, reason: 'update_failed' });
  }

  return json({ ok: true });
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

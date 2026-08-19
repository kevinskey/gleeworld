// auctions-inbound — receives auction-house notification email from Resend.
//
// Flow: mail to auctions@inbound.gleeworld.org → Resend receives and stores
// it → Resend POSTs this webhook → we fetch the full message and land it
// verbatim in ext_auction_inbound_emails. Interpretation happens later, in
// auctions-parse-email.
//
// This endpoint does as little as possible on purpose. Resend retries on
// timeout, and its webhook payload deliberately omits the body, so the only
// work here is: verify the signature, fetch the message, store it, return
// 200. No LLM call, no parsing — those take seconds and would turn retries
// into duplicated work.
//
// Auth: Svix signature over the RAW body, using RESEND_INBOUND_SECRET. This
// is a public endpoint, so an unsigned or stale request is refused outright.
//
//   POST /functions/v1/auctions-inbound

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verifySvixSignature } from '../_shared/svixVerify.ts';
import { htmlToText, matchSourceByDomain, type EmailSource } from '../_shared/auctionEmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, svix-id, svix-timestamp, svix-signature',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  // Read the body as raw text: the signature covers the exact bytes, so
  // parsing first and re-serialising would break verification.
  const rawBody = await req.text();

  const ok = await verifySvixSignature(
    rawBody,
    {
      'svix-id': req.headers.get('svix-id'),
      'svix-timestamp': req.headers.get('svix-timestamp'),
      'svix-signature': req.headers.get('svix-signature'),
    },
    Deno.env.get('RESEND_INBOUND_SECRET'),
  );
  if (!ok) return json({ error: 'invalid signature' }, 401);

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'body was not JSON' }, 400);
  }

  // Resend sends several event types to one endpoint; anything that is not
  // an inbound message is acknowledged and ignored.
  if (event.type !== 'email.received') {
    return json({ ok: true, ignored: event.type ?? 'unknown' });
  }

  const data = (event.data ?? {}) as Record<string, unknown>;
  const emailId = String(data.email_id ?? data.id ?? '');
  if (!emailId) return json({ error: 'event carried no email id' }, 400);

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
  if (!resendKey) return json({ error: 'RESEND_API_KEY is not set' }, 500);

  // The webhook payload omits body, headers, and attachments by design, so
  // the content has to be fetched.
  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // A non-2xx here is worth a retry from Resend, so fail loudly.
    return json({ error: `could not fetch message: ${res.status} ${detail.slice(0, 200)}` }, 502);
  }
  const message = await res.json() as Record<string, unknown>;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: sources } = await admin
    .from('ext_auction_sources')
    .select('id, name, base_url');

  const from = typeof message.from === 'string' ? message.from : null;
  const matched = matchSourceByDomain(from, (sources ?? []) as EmailSource[]);

  const to = Array.isArray(message.to)
    ? (message.to as unknown[]).map(String).join(', ')
    : (message.to as string) ?? null;

  const html = (message.html as string) ?? null;
  const text = (message.text as string) ?? null;

  const { error } = await admin
    .from('ext_auction_inbound_emails')
    .upsert({
      provider: 'resend',
      provider_email_id: emailId,
      message_id: (message.message_id as string) ?? null,
      from_address: from,
      to_address: to,
      subject: (message.subject as string) ?? null,
      // Keep both, but guarantee there is always readable text: several
      // houses send HTML only, and the parser should not have to care.
      text_body: text ?? (html ? htmlToText(html) : null),
      html_body: html,
      received_at: (message.created_at as string) ?? new Date().toISOString(),
      source_id: matched?.id ?? null,
      status: 'pending',
    }, { onConflict: 'provider,provider_email_id', ignoreDuplicates: true });

  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, email_id: emailId, matched_source: matched?.name ?? null });
});

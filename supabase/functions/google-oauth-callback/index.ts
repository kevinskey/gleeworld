// google-oauth-callback — receives the redirect from Google, exchanges the
// auth code for tokens, and stores the refresh_token on
// gw_google_connections. Then bounces the browser back to the frontend.
//
// Public endpoint (Google does the redirect with the user's browser).
// Auth is the OAuth state nonce we minted in google-oauth-start — anything
// not matching a row in gw_oauth_states gets rejected.
//
// Requires env vars:
//   GW_GOOGLE_CAL_CLIENT_ID
//   GW_GOOGLE_CAL_CLIENT_SECRET
//   GW_GOOGLE_CAL_REDIRECT_URI  (must match the value used in -start, default below)
//   APP_BASE_URL         (default: https://gleeworld.org — where the user
//                         goes when the dance is done)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const APP_BASE_URL_DEFAULT = 'https://gleeworld.org';

function htmlError(msg: string, base: string) {
  return new Response(
    `<!doctype html><meta charset=utf-8><title>GleeWorld — Google sync</title>
     <body style="font-family:system-ui;padding:40px;max-width:540px;margin:auto">
     <h2>Google sync couldn't complete</h2>
     <p style="color:#b91c1c">${msg.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]!))}</p>
     <p><a href="${base}/dashboard/calendar">Back to calendar</a></p>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

serve(async (req) => {
  const baseUrl = Deno.env.get('APP_BASE_URL') ?? APP_BASE_URL_DEFAULT;
  const url = new URL(req.url);
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return htmlError(`Google returned: ${error}`, baseUrl);
  if (!code || !state) return htmlError('Missing code or state', baseUrl);

  const clientId     = Deno.env.get('GW_GOOGLE_CAL_CLIENT_ID');
  const clientSecret = Deno.env.get('GW_GOOGLE_CAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) return htmlError('Google OAuth secrets not configured on the server.', baseUrl);

  const redirectUri = Deno.env.get('GW_GOOGLE_CAL_REDIRECT_URI')
    ?? 'https://supabase.gleeworld.org/functions/v1/google-oauth-callback';

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  // 1. Validate state.
  const { data: stateRow, error: stateErr } = await admin
    .from('gw_oauth_states')
    .select('user_id, tenant_id, redirect_to, expires_at')
    .eq('state', state)
    .maybeSingle();

  if (stateErr || !stateRow) return htmlError('Invalid or expired state — please retry from the Calendar Settings dialog.', baseUrl);
  if (new Date(stateRow.expires_at) < new Date()) return htmlError('State expired (>10 min). Retry the connect flow.', baseUrl);

  // One-time use — delete immediately whatever happens next.
  await admin.from('gw_oauth_states').delete().eq('state', state);

  // 2. Exchange code for tokens.
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    return htmlError(`Token exchange failed: ${t.slice(0, 300)}`, baseUrl);
  }
  const tokens = await tokenRes.json() as {
    access_token: string; refresh_token?: string; expires_in: number; scope: string; token_type: string; id_token?: string;
  };

  if (!tokens.refresh_token) {
    // Google omits refresh_token if the user previously granted offline
    // access AND we forgot prompt=consent. -start sets prompt=consent, so
    // this should only happen if someone tampers with the URL.
    return htmlError('Google did not return a refresh token. Try disconnecting any prior GleeWorld connection from your Google account permissions, then retry.', baseUrl);
  }

  // 3. Pull the user's email / sub from the id_token (lightweight parse —
  // we don't verify the signature here because the token came directly from
  // Google over TLS in response to our own request).
  let googleEmail: string | null = null;
  let googleSub: string | null = null;
  if (tokens.id_token) {
    try {
      const payload = JSON.parse(atob(tokens.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      googleEmail = payload.email ?? null;
      googleSub   = payload.sub   ?? null;
    } catch { /* non-fatal */ }
  }

  // 4. Upsert the connection. `unique (user_id)` means re-connecting just
  // refreshes the existing row.
  const expiresAt = new Date(Date.now() + (tokens.expires_in - 30) * 1000).toISOString();
  const { error: upErr } = await admin
    .from('gw_google_connections')
    .upsert({
      user_id:       stateRow.user_id,
      tenant_id:     stateRow.tenant_id,
      google_email:  googleEmail,
      google_sub:    googleSub,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type:    tokens.token_type ?? 'Bearer',
      expires_at:    expiresAt,
      scope:         tokens.scope,
      last_error:    null,
    }, { onConflict: 'user_id' });

  if (upErr) return htmlError('Could not save connection: ' + upErr.message, baseUrl);

  // 5. Done — bounce the browser back to the app with a flag the frontend
  // can show ("Google connected ✓").
  //
  // redirect_to may be either a path (`/dashboard/calendar`) or a full URL
  // (`https://demo.gleeworld.org/dashboard/office-hours`) depending on the
  // caller. Concatenating baseUrl with a full URL produces a broken
  // `https://gleeworld.orghttps://...` link, so resolve via the URL API and
  // append the success flag as a proper query param.
  const raw = stateRow.redirect_to ?? '/dashboard/calendar';
  const dest = new URL(raw, baseUrl);
  dest.searchParams.set('google', 'connected');
  return new Response(null, { status: 302, headers: { Location: dest.toString() } });
});

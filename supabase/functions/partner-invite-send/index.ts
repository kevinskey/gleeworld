import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_HOST = Deno.env.get("APP_HOST") ?? "https://gleeworld.org";
const FROM_ADDRESS = Deno.env.get("PARTNER_INVITE_FROM") ?? "GleeWorld <noreply@gleeworld.org>";

function b64url(bytes: Uint8Array): string {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await supa.auth.getUser(jwt);
  if (userErr || !userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  // Verify admin
  const supaSvc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: prof } = await supaSvc.from("gw_profiles").select("is_admin,is_super_admin").eq("user_id", userData.user.id).single();
  if (!prof || (!prof.is_admin && !prof.is_super_admin)) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const display_name = body.display_name ? String(body.display_name).trim() : null;
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return new Response(JSON.stringify({ error: "invalid email" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const tokenBytes = new Uint8Array(32); crypto.getRandomValues(tokenBytes);
  const token = b64url(tokenBytes);

  const { data: invite, error: insErr } = await supaSvc
    .from("gw_partner_invites")
    .insert({ email, display_name, invited_by: userData.user.id, token })
    .select("id, token")
    .single();
  if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  const link = `${APP_HOST}/partner/invite/${token}`;
  const emailBody = `
    <p>Hi${display_name ? " " + display_name : ""},</p>
    <p>Kevin at GleeWorld invited you to sell your scores in the composer store. Click below to set up your storefront and payouts:</p>
    <p><a href="${link}">${link}</a></p>
    <p>The link expires in 30 days.</p>
    <p>— GleeWorld</p>
  `;

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM_ADDRESS, to: email,
      subject: "Your GleeWorld composer store invite",
      html: emailBody,
    }),
  });
  if (!emailRes.ok) {
    // Row is still there — Kevin can copy the link from admin UI.
    return new Response(JSON.stringify({ id: invite.id, token: invite.token, email_error: await emailRes.text() }), {
      status: 200, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ id: invite.id, token: invite.token }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});

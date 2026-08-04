import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData, error: userErr } = await supa.auth.getUser(jwt);
  if (userErr || !userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  if (!userData.user.email_confirmed_at) {
    return new Response(JSON.stringify({ error: "please verify your email address first" }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const { token } = await req.json().catch(() => ({ token: "" }));
  if (!token) return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: invite, error: invErr } = await supa
    .from("gw_partner_invites").select("*").eq("token", token).maybeSingle();
  if (invErr || !invite) return new Response(JSON.stringify({ error: "invalid token" }), { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } });
  if (invite.redeemed_at) return new Response(JSON.stringify({ error: "already redeemed" }), { status: 409, headers: { ...corsHeaders, "content-type": "application/json" } });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return new Response(JSON.stringify({ error: "expired" }), { status: 410, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  if (invite.email.toLowerCase() !== (userData.user.email ?? "").toLowerCase()) {
    return new Response(JSON.stringify({ error: `this invite is for ${invite.email}, but you're signed in as ${userData.user.email}. Sign out and back in with the invited address.` }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const displayName = invite.display_name ?? userData.user.email?.split("@")[0] ?? "Composer";
  const { data: partner, error: pErr } = await supa
    .from("gw_partners")
    .insert({
      user_id: userData.user.id,
      display_name: displayName,
      contact_email: userData.user.email,
      status: "onboarding",
      invite_token: null,
      invited_at: invite.created_at,
    })
    .select("id")
    .single();
  if (pErr) {
    if (pErr.code === '23505') {
      // Already a partner — mark invite redeemed to prevent reuse and return 409.
      await supa.from("gw_partner_invites").update({ redeemed_at: new Date().toISOString(), redeemed_by_user_id: userData.user.id }).eq("id", invite.id);
      return new Response(JSON.stringify({ error: "already a partner" }), { status: 409, headers: { ...corsHeaders, "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: pErr.message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  await supa
    .from("gw_partner_invites")
    .update({ redeemed_at: new Date().toISOString(), redeemed_by_user_id: userData.user.id })
    .eq("id", invite.id);

  return new Response(JSON.stringify({ partner_id: partner.id }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});

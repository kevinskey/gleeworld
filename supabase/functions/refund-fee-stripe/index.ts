import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.25.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Admin-invoked (browser → edge fn): CORS required
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // ── Auth: verify the caller is a real authenticated user ──────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Service-role client: bypass RLS for admin lookups; validate user separately
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userData } = await admin.auth.getUser(jwt);
    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Admin role gate: must be admin/super_admin before touching Stripe ──
    const { data: profile } = await admin
      .from("gw_profiles")
      .select("is_admin, is_super_admin, role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (
      !profile?.is_admin &&
      !profile?.is_super_admin &&
      !["admin", "super_admin", "super-admin"].includes(profile?.role ?? "")
    ) {
      return new Response(
        JSON.stringify({ error: "forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    const { studentFeeId, note } = await req.json().catch(() => ({} as Record<string, string>));
    if (!studentFeeId) {
      return new Response(
        JSON.stringify({ error: "studentFeeId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Load the fee row ───────────────────────────────────────────────────
    const { data: fee, error: feeErr } = await admin
      .from("gw_student_fees")
      .select("id, status, payment_method, stripe_payment_intent_id")
      .eq("id", studentFeeId)
      .single();

    if (feeErr || !fee) {
      return new Response(
        JSON.stringify({ error: "Fee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Validate: must be a Stripe-paid fee ────────────────────────────────
    if (fee.payment_method !== "stripe" || !fee.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: "Fee was not paid via Stripe — use refund_fee RPC directly" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (fee.status === "refunded") {
      return new Response(
        JSON.stringify({ error: "Fee is already refunded" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Issue Stripe refund ────────────────────────────────────────────────
    try {
      await stripe.refunds.create({ payment_intent: fee.stripe_payment_intent_id });
    } catch (stripeErr) {
      console.error("Stripe refund error:", (stripeErr as Error).message);
      return new Response(
        JSON.stringify({ error: `Stripe refund failed: ${(stripeErr as Error).message}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Call refund_fee RPC to update DB status ────────────────────────────
    const { error: rpcError } = await admin.rpc("refund_fee", {
      p_fee_id: studentFeeId,
      p_note: note ?? "Refunded via Stripe",
    });

    if (rpcError) {
      // Stripe refund already issued — log prominently but return 500 so caller knows
      console.error("refund_fee RPC error (Stripe refund already issued):", rpcError.message);
      return new Response(
        JSON.stringify({ error: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("refund-fee-stripe unhandled error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

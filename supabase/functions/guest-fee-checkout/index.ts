// Parent-payable fee checkout. UNAUTHENTICATED by design: the fee row's
// guest_pay_token is the capability — anyone holding the link (typically a
// parent it was forwarded to) can view a minimal summary and pay. Wrong
// id/token pairs return the same 404 body so row existence never leaks.
//
// POST { feeId, token, action: 'summary' | 'checkout' }
//   summary  → { fee, org, online, offline }
//   checkout → { url }  (Stripe Checkout on the tenant's connected account —
//                        direct charge, NO application fee, same posture as
//                        create-fee-payment; verify-fee-payment consumes the
//                        identical metadata shape unchanged)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.25.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { feeId, token, action } = body as { feeId?: string; token?: string; action?: string };
    if (!feeId || !token || !action) {
      return json({ error: "feeId, token, and action are required" }, 400);
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: fee } = await supa
      .from("gw_student_fees")
      .select("*, gw_tenants!inner(id, name, stripe_account_id, stripe_charges_enabled)")
      .eq("id", feeId)
      .single();

    // Same body for missing row and wrong token.
    if (!fee || fee.guest_pay_token !== token) {
      return json({ error: "This payment link is not valid." }, 404);
    }

    const tenant = (fee as Record<string, any>).gw_tenants;
    const online = !!(tenant.stripe_charges_enabled && tenant.stripe_account_id);
    const remaining = Number(fee.amount) - Number(fee.paid_amount ?? 0);

    if (action === "summary") {
      const [{ data: profile }, { data: settings }] = await Promise.all([
        supa.from("gw_profiles").select("full_name").eq("user_id", fee.user_id).maybeSingle(),
        supa.from("gw_tenant_fee_settings").select("*").eq("tenant_id", tenant.id).maybeSingle(),
      ]);
      const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] || "your student";
      return json({
        fee: {
          name: fee.name,
          category: fee.category,
          amount: Number(fee.amount),
          paid_amount: Number(fee.paid_amount ?? 0),
          remaining,
          due_date: fee.due_date,
          status: fee.status,
          student_first_name: firstName,
        },
        org: { name: tenant.name },
        online,
        offline: settings
          ? {
              methods: settings.accepted_manual_methods ?? ["cash", "check"],
              contact_name: settings.treasurer_contact_name ?? undefined,
              contact_email: settings.treasurer_contact_email ?? undefined,
              contact_phone: settings.treasurer_contact_phone ?? undefined,
            }
          : null,
      });
    }

    if (action !== "checkout") return json({ error: "Unknown action" }, 400);

    if (fee.status === "paid") return json({ error: "This fee is already paid — thank you!" }, 400);
    if (fee.status === "refunded" || fee.status === "waived") {
      return json({ error: `This fee is ${fee.status}; no payment is due.` }, 400);
    }
    if (remaining <= 0) return json({ error: "No balance remains on this fee." }, 400);
    if (!online) return json({ error: "Online payment is not available for this organization." }, 400);

    const origin = req.headers.get("origin") || "https://gleeworld.org";
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: fee.name, description: fee.category ?? undefined },
              unit_amount: Math.round(remaining * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/pay/fee/${feeId}?token=${token}&status=success`,
        cancel_url: `${origin}/pay/fee/${feeId}?token=${token}&status=cancelled`,
        metadata: {
          student_fee_id: feeId,
          tenant_id: tenant.id,
          user_id: fee.user_id,
          payment_type: "full",
          installment_id: "",
          payment_plan_id: "",
        },
      },
      { stripeAccount: tenant.stripe_account_id },
    );

    return json({ url: session.url });
  } catch (error) {
    console.error("guest-fee-checkout error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});

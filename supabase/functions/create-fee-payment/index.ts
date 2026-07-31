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

interface FeePaymentRequest {
  studentFeeId: string;
  paymentType: "full" | "installment";
  installmentId?: string;
  paymentPlanId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "https://gleeworld.org";

    // Service role client for all DB access (RLS bypassed; we enforce ownership manually)
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: userData } = await supa.auth.getUser(jwt);
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body: FeePaymentRequest = await req.json().catch(() => ({}));
    if (!body.studentFeeId) {
      return new Response(JSON.stringify({ error: "studentFeeId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load fee + tenant in one query; enforce ownership via user_id filter
    const { data: fee, error: feeErr } = await supa
      .from("gw_student_fees")
      .select("*, gw_tenants!inner(id, stripe_account_id, stripe_charges_enabled)")
      .eq("id", body.studentFeeId)
      .eq("user_id", user.id)
      .single();

    if (feeErr || !fee) {
      return new Response(JSON.stringify({ error: "Fee not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (fee.status === "paid") {
      return new Response(JSON.stringify({ error: "Fee already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (fee.status === "refunded" || fee.status === "waived") {
      return new Response(JSON.stringify({ error: `Fee is ${fee.status}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenant = (fee as any).gw_tenants;
    if (!tenant.stripe_charges_enabled || !tenant.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "Tenant has not enabled Stripe Connect. Please contact your treasurer." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine line-item amount and label
    let amountCents: number;
    let itemName: string;

    if (body.paymentType === "full") {
      const remaining = Number(fee.amount) - Number(fee.paid_amount ?? 0);
      amountCents = Math.round(remaining * 100);
      itemName = fee.name;
    } else if (body.paymentType === "installment") {
      if (!body.installmentId) {
        return new Response(JSON.stringify({ error: "installmentId required for installment payment" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load installment + owning payment plan to verify ownership
      const { data: inst, error: instErr } = await supa
        .from("gw_fee_plan_installments")
        .select("*, gw_fee_payment_plans!inner(user_id, student_fee_id)")
        .eq("id", body.installmentId)
        .single();

      if (instErr || !inst) {
        return new Response(JSON.stringify({ error: "Installment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if ((inst as any).gw_fee_payment_plans.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (inst.status === "paid") {
        return new Response(JSON.stringify({ error: "Installment already paid" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      amountCents = Math.round(Number(inst.amount) * 100);
      itemName = `${fee.name} — installment ${inst.installment_number}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid payment type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Stripe Checkout Session with Connect destination charge
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: itemName,
              description: fee.category ?? undefined,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: 0,
        transfer_data: { destination: tenant.stripe_account_id },
      },
      success_url: `${origin}/dashboard/my-fees?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${origin}/dashboard/my-fees?status=cancelled`,
      metadata: {
        student_fee_id: body.studentFeeId,
        tenant_id: tenant.id,
        user_id: user.id,
        payment_type: body.paymentType,
        installment_id: body.installmentId ?? "",
        payment_plan_id: body.paymentPlanId ?? "",
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id, amount: amountCents / 100 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("create-fee-payment error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

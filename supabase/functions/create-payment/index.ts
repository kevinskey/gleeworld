import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@14.21.0/+esm";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  // Create Supabase client using the anon key for optional user auth
  const supabaseClient = createClient(supabaseUrl, supabaseAnon);

  try {
    const origin = req.headers.get("origin") || "https://gleeworld.org";

    // Parse body for dynamic pricing and email fallback
    const { amount, currency = "usd", productName = "Lesson", email: guestEmail } = await req.json().catch(() => ({}));
    const amountInt = Number.isFinite(Number(amount)) ? Math.max(0, Math.floor(Number(amount))) : 0;

    // Try to retrieve authenticated user (if any)
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : undefined;
    let userEmail: string | undefined;

    if (token) {
      const { data } = await supabaseClient.auth.getUser(token);
      userEmail = data.user?.email || undefined;
    }

    const finalEmail = userEmail || guestEmail || "guest@gleeworld.org";

    // Initialize Stripe
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    // Try finding an existing customer if we have a user email
    let customerId: string | undefined;
    if (finalEmail) {
      const customers = await stripe.customers.list({ email: finalEmail, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    // Create one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : finalEmail,
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: productName },
            unit_amount: amountInt, // cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/booking/confirmation`,
      cancel_url: `${origin}/booking/customer-info`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

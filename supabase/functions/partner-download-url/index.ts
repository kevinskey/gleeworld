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
  const { data: userData } = await supa.auth.getUser(jwt);
  if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { order_item_id } = await req.json().catch(() => ({}));
  if (!order_item_id) return new Response(JSON.stringify({ error: "order_item_id required" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: item, error: itemErr } = await supa
    .from("gw_partner_order_items")
    .select("id, order_id, watermarked_storage_path, refunded_at")
    .eq("id", order_item_id)
    .single();
  if (itemErr || !item) return new Response(JSON.stringify({ error: "item not found" }), { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: order } = await supa
    .from("gw_partner_orders").select("buyer_user_id, status").eq("id", item.order_id).single();
  const isBuyer = !!order && order.buyer_user_id === userData.user.id;
  // Seat licensing: recipients of a share get the SAME signed URL, used by
  // the in-app viewer (the UI gives them no download affordance; the seat
  // model is enforced at share time by share_partner_purchase).
  let isSharedWith = false;
  if (!isBuyer && order) {
    const { data: share } = await supa
      .from("gw_partner_score_shares")
      .select("id")
      .eq("order_item_id", item.id)
      .eq("shared_with_user_id", userData.user.id)
      .maybeSingle();
    isSharedWith = !!share;
  }
  if (!order || (!isBuyer && !isSharedWith)) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  // partial_refund means OTHER items were refunded — this one stays
  // downloadable unless it carries its own refunded_at stamp below.
  if (order.status !== "paid" && order.status !== "partial_refund") {
    return new Response(JSON.stringify({ error: "order not paid" }), { status: 402, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  if (item.refunded_at) {
    return new Response(JSON.stringify({ error: "purchase refunded" }), { status: 410, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
  if (!item.watermarked_storage_path) {
    return new Response(JSON.stringify({ error: "watermark still processing, try again shortly" }), { status: 425, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  const { data: signed, error: signErr } = await supa.storage
    .from("personal-scores")
    .createSignedUrl(item.watermarked_storage_path, 300);
  if (signErr || !signed) {
    return new Response(JSON.stringify({ error: "sign failed" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  // Audit — best-effort; failure doesn't block the download.
  await supa.from("gw_partner_downloads").insert({
    order_item_id: item.id,
    user_agent: req.headers.get("user-agent"),
  });

  return new Response(JSON.stringify({ url: signed.signedUrl, expires_in: 300 }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});

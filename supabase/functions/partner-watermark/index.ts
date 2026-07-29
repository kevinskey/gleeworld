import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { order_item_id } = await req.json().catch(() => ({}));
  if (!order_item_id) return new Response(JSON.stringify({ error: "order_item_id required" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: item, error: itemErr } = await supa
    .from("gw_partner_order_items")
    .select("id, order_id, partner_score_id")
    .eq("id", order_item_id)
    .single();
  if (itemErr || !item) return new Response(JSON.stringify({ error: "item not found" }), { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: order } = await supa
    .from("gw_partner_orders").select("id, buyer_user_id").eq("id", item.order_id).single();
  const { data: score } = await supa
    .from("gw_partner_scores").select("master_storage_path, title").eq("id", item.partner_score_id).single();
  if (!order || !score) return new Response(JSON.stringify({ error: "order or score missing" }), { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: profile } = await supa
    .from("gw_profiles").select("full_name, email").eq("user_id", order.buyer_user_id).maybeSingle();
  const displayName = profile?.full_name?.trim()
    || (profile?.email ? profile.email.split("@")[0] : "GleeWorld buyer");

  // Download master PDF
  const { data: pdfBlob, error: dlErr } = await supa.storage
    .from("partner-scores-master").download(score.master_storage_path);
  if (dlErr || !pdfBlob) return new Response(JSON.stringify({ error: "master download failed" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
  const pdfDoc = await PDFDocument.load(bytes);
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const orderShort = order.id.substring(0, 8);
  const footer = `Purchased by ${displayName} · GleeWorld Order #${orderShort} · License to one performer`;

  for (const page of pdfDoc.getPages()) {
    const { width } = page.getSize();
    page.drawRectangle({
      x: 0, y: 0, width, height: 22, color: rgb(0.96, 0.96, 0.96), opacity: 0.9,
    });
    page.drawText(footer, {
      x: 12, y: 8, size: 8, font: helv, color: rgb(0.35, 0.35, 0.35),
    });
  }

  const stamped = await pdfDoc.save();
  const path = `${order.buyer_user_id}/store/${item.id}.pdf`;
  const { error: upErr } = await supa.storage
    .from("personal-scores").upload(path, stamped, {
      contentType: "application/pdf", upsert: true,
    });
  if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  await supa.from("gw_partner_order_items").update({ watermarked_storage_path: path }).eq("id", item.id);

  // Insert personal library row now that the file exists.
  await supa.from("gw_personal_scores").insert({
    user_id: order.buyer_user_id,
    title: score.title,
    source: "purchase",
    entitlement_id: null,
    storage_path: path,
  });

  return new Response(JSON.stringify({ watermarked_storage_path: path }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});

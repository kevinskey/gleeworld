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

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: userData } = await supa.auth.getUser(jwt);
  if (!userData.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { score_id } = await req.json().catch(() => ({}));
  if (!score_id) return new Response(JSON.stringify({ error: "score_id required" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

  const { data: score, error } = await supa
    .from("gw_partner_scores").select("*").eq("id", score_id).single();
  if (error || !score) return new Response(JSON.stringify({ error: "score not found" }), { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } });

  // Verify caller owns the score or is an admin.
  const { data: partner } = await supa.from("gw_partners").select("id").eq("user_id", userData.user.id).maybeSingle();
  const { data: prof } = await supa.from("gw_profiles").select("is_admin,is_super_admin").eq("user_id", userData.user.id).single();
  const isAdmin = !!(prof?.is_admin || prof?.is_super_admin);
  if (!isAdmin && (!partner || partner.id !== score.partner_id)) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  // Fetch master PDF
  const { data: pdfBlob, error: dlErr } = await supa.storage
    .from("partner-scores-master").download(score.master_storage_path);
  if (dlErr || !pdfBlob) return new Response(JSON.stringify({ error: "master download failed" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();

  // Watermark page 1 and export as a single-page PDF thumbnail
  // (PNG rasterization isn't available in pure pdf-lib on Deno without
  //  a native raster dep; a watermarked single-page PDF is a good v1
  //  thumbnail — buyers see the composer's actual page 1 with a stamp.)
  const thumbDoc = await PDFDocument.create();
  const [copiedPage] = await thumbDoc.copyPages(pdfDoc, [0]);
  thumbDoc.addPage(copiedPage);

  const helv = await thumbDoc.embedFont(StandardFonts.Helvetica);
  const page = thumbDoc.getPage(0);
  const { width } = page.getSize();
  page.drawText("Sample — GleeWorld Composer Store", {
    x: 20, y: 12, size: 9, font: helv, color: rgb(0.5, 0.5, 0.5),
  });
  page.drawRectangle({
    x: 0, y: 0, width, height: 22, borderWidth: 0, opacity: 0.05,
    color: rgb(0.9, 0.9, 0.9),
  });

  const thumbBytes = await thumbDoc.save();
  const thumbPath = `${score.partner_id}/thumbs/${score.id}.pdf`;
  const { error: upErr } = await supa.storage
    .from("partner-assets")
    .upload(thumbPath, thumbBytes, { contentType: "application/pdf", upsert: true });
  if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });

  await supa.from("gw_partner_scores").update({
    page_count: pageCount,
    thumbnail_storage_path: thumbPath,
  }).eq("id", score.id);

  return new Response(JSON.stringify({ page_count: pageCount, thumbnail_storage_path: thumbPath }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});

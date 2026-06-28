// lti-grade-push — POSTs a score back to a Canvas AGS lineitem.
//
// Called internally by GleeWorld (e.g., when a teacher grades a practice
// take). Body:
//   {
//     "lti_user_link_id": "<uuid>",     // identifies the Canvas user
//     "context_link_id":  "<uuid>",     // identifies the Canvas course / lineitem context
//     "resource_type":    "practice_take",
//     "resource_id":      "<uuid>",
//     "score":            87,           // 0..score_maximum
//     "score_maximum":    100,
//     "comment":          "Lovely tone, watch the diphthong on 'lord'."
//   }
//
// If the (context_link_id, resource_type, resource_id) tuple doesn't
// already map to a lineitem, we create one in Canvas first, then post
// the score. Idempotent on (context, resource) — re-grading just
// updates the existing lineitem.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requestPlatformToken, AGS_SCOPES } from "../_shared/lti.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  lti_user_link_id: string;
  context_link_id: string;
  resource_type: string;
  resource_id: string;
  score: number;
  score_maximum?: number;
  comment?: string;
  label?: string;
}

function err(status: number, code: string, detail?: string) {
  return new Response(JSON.stringify({ error: code, detail }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return err(405, "method_not_allowed");

  // Caller must present a valid GleeWorld JWT — we trust the app for
  // authorization. The actual Canvas auth comes from our tool key.
  const auth = req.headers.get("Authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return err(401, "unauthorized");

  let body: Body;
  try { body = await req.json(); } catch { return err(400, "bad_json"); }
  if (!body.lti_user_link_id || !body.context_link_id || !body.resource_type || !body.resource_id) {
    return err(400, "missing_fields");
  }
  const score = Number(body.score);
  const scoreMax = Number(body.score_maximum ?? 100);
  if (!Number.isFinite(score) || !Number.isFinite(scoreMax) || scoreMax <= 0) {
    return err(400, "bad_score");
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Resolve the context (which Canvas course, which AGS endpoints).
  const { data: ctx, error: ctxErr } = await admin
    .from("lti_context_links")
    .select("id, platform_id, ags_lineitems_url, ags_lineitem_url, ags_scopes")
    .eq("id", body.context_link_id)
    .single();
  if (ctxErr || !ctx) return err(404, "context_not_found", ctxErr?.message);
  if (!ctx.ags_lineitems_url && !ctx.ags_lineitem_url) {
    return err(409, "ags_not_available", "Launch did not include AGS endpoints; enable in Canvas tool config.");
  }

  // Resolve the platform (client_id + token endpoint).
  const { data: platform, error: pErr } = await admin
    .from("lti_platforms")
    .select("client_id, auth_token_url")
    .eq("id", ctx.platform_id)
    .single();
  if (pErr || !platform) return err(500, "platform_lookup_failed", pErr?.message);

  // Resolve the Canvas user (sub).
  const { data: link, error: lErr } = await admin
    .from("lti_user_links")
    .select("lti_sub")
    .eq("id", body.lti_user_link_id)
    .single();
  if (lErr || !link) return err(404, "user_link_not_found", lErr?.message);

  // Request an access token with the AGS lineitem + score scopes.
  let token: string;
  try {
    token = await requestPlatformToken({
      clientId: platform.client_id,
      tokenUrl: platform.auth_token_url,
      scopes: [AGS_SCOPES.LINEITEM, AGS_SCOPES.SCORE],
    });
  } catch (e) {
    return err(502, "token_exchange_failed", e instanceof Error ? e.message : String(e));
  }

  // Find or create the lineitem.
  let lineitemUrl: string | null = null;
  const { data: existingLI } = await admin
    .from("lti_grade_lineitems")
    .select("id, lineitem_url")
    .eq("context_link_id", ctx.id)
    .eq("resource_type", body.resource_type)
    .eq("resource_id", body.resource_id)
    .maybeSingle();
  if (existingLI) {
    lineitemUrl = existingLI.lineitem_url;
  } else if (ctx.ags_lineitem_url) {
    // Launch bound to a single lineitem — Canvas already created it.
    lineitemUrl = ctx.ags_lineitem_url;
    await admin.from("lti_grade_lineitems").insert({
      context_link_id: ctx.id,
      lineitem_url: lineitemUrl,
      resource_type: body.resource_type,
      resource_id: body.resource_id,
      score_maximum: scoreMax,
      label: body.label ?? null,
    });
  } else {
    // Create a new lineitem via POST to ags_lineitems_url.
    const createRes = await fetch(ctx.ags_lineitems_url!, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/vnd.ims.lis.v2.lineitem+json",
        "Accept": "application/vnd.ims.lis.v2.lineitem+json",
      },
      body: JSON.stringify({
        scoreMaximum: scoreMax,
        label: body.label ?? `${body.resource_type}:${body.resource_id.slice(0, 8)}`,
        resourceId: `${body.resource_type}:${body.resource_id}`,
        tag: body.resource_type,
      }),
    });
    if (!createRes.ok) {
      const t = await createRes.text().catch(() => "");
      return err(502, "lineitem_create_failed", `${createRes.status}: ${t.slice(0, 300)}`);
    }
    const li = await createRes.json();
    lineitemUrl = li.id as string;
    await admin.from("lti_grade_lineitems").insert({
      context_link_id: ctx.id,
      lineitem_url: lineitemUrl!,
      resource_type: body.resource_type,
      resource_id: body.resource_id,
      score_maximum: scoreMax,
      label: body.label ?? null,
    });
  }

  // Post the score to {lineitem}/scores.
  const scoreUrl = lineitemUrl!.endsWith("/scores") ? lineitemUrl! : `${lineitemUrl}/scores`;
  const scoreRes = await fetch(scoreUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/vnd.ims.lis.v1.score+json",
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      scoreGiven: score,
      scoreMaximum: scoreMax,
      activityProgress: "Completed",
      gradingProgress: "FullyGraded",
      userId: link.lti_sub,
      comment: body.comment,
    }),
  });
  if (!scoreRes.ok) {
    const t = await scoreRes.text().catch(() => "");
    return err(502, "score_post_failed", `${scoreRes.status}: ${t.slice(0, 300)}`);
  }

  return new Response(JSON.stringify({
    ok: true,
    lineitem_url: lineitemUrl,
    score_pushed: score,
    score_maximum: scoreMax,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

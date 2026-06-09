// generate-action-plan
//
// Phase 4 of Program Health. POST { ensemble_id } → loads the latest health
// snapshot, builds a locked prompt (one recommendation per high-severity
// flag, ranked), calls OpenAI for a JSON-only payload, and persists it to
// gw_action_plans. Returns { plan_id }.
//
// "Locked" means the model is constrained: each recommendation must map to
// one flag from the snapshot. Open-ended brainstorming was explicitly out of
// scope at the start of Phase 4.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = "gpt-4o-mini";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Flag {
  key: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  metric_value?: number;
  voice_part?: string;
}

interface Snapshot {
  id: string;
  attendance_rate_30d: number | null;
  attendance_delta: number | null;
  retention_rate: number | null;
  readiness_gap_days: number | null;
  stability_score: number | null;
  thin_sections: Array<{ voice_part: string; current: number; target: number; severity: number }> | null;
  flags: Flag[] | null;
}

interface RawRec {
  rank: number;
  flag_key: string;
  title: string;
  rationale: string;
  steps: string[];
  owner_hint?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY not set" }, 500);

  try {
    const { ensemble_id } = await req.json().catch(() => ({}));
    if (typeof ensemble_id !== "string" || !ensemble_id) {
      return json({ error: "ensemble_id required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: ensemble, error: eErr } = await supabase
      .from("gw_ensembles")
      .select("id, name, description")
      .eq("id", ensemble_id)
      .maybeSingle();
    if (eErr) throw eErr;
    if (!ensemble) return json({ error: "ensemble not found" }, 404);

    const { data: snapshot, error: sErr } = await supabase
      .from("gw_health_snapshots")
      .select("*")
      .eq("ensemble_id", ensemble_id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!snapshot) return json({ error: "no snapshot to plan from" }, 409);

    const snap = snapshot as Snapshot;
    const flags = (snap.flags ?? []).filter((f) => f.severity === "high");

    if (flags.length === 0) {
      return json({ error: "no high-severity flags to plan against" }, 409);
    }

    const inputContext = buildContext(ensemble.name, snap, flags);

    const aiPayload = await callOpenAI(OPENAI_API_KEY, inputContext, flags);

    // Validate: every rec must reference a flag that was in the input,
    // ranks must be 1..N distinct, steps non-empty.
    const validFlagKeys = new Set(flags.map((f) => f.key));
    const recs = aiPayload.recommendations
      .filter((r) => validFlagKeys.has(r.flag_key))
      .filter((r) => Array.isArray(r.steps) && r.steps.length > 0)
      .slice(0, flags.length)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    if (recs.length === 0) {
      return json({ error: "model returned no valid recommendations" }, 502);
    }

    const planPayload = {
      recommendations: recs,
      snapshot_id: snap.id,
    };

    const { data: inserted, error: insErr } = await supabase
      .from("gw_action_plans")
      .insert({
        ensemble_id,
        model: MODEL,
        input_context: inputContext,
        plan: planPayload,
        status: "active",
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    return json({ plan_id: inserted.id, recommendations: recs.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate-action-plan failed:", message);
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildContext(name: string, snap: Snapshot, flags: Flag[]): string {
  const thin = (snap.thin_sections ?? [])
    .map((t) => `${t.voice_part} ${t.current}/${t.target}`)
    .join(", ") || "none";

  return [
    `Ensemble: ${name}`,
    `Stability score: ${snap.stability_score}`,
    `30-day attendance: ${snap.attendance_rate_30d}% (delta ${snap.attendance_delta})`,
    `90-day retention: ${snap.retention_rate}%`,
    `Thin sections: ${thin}`,
    `Readiness gap (days): ${snap.readiness_gap_days ?? "n/a"}`,
    `High-severity flags:`,
    ...flags.map((f) => `- ${f.key}: ${f.title} — ${f.detail}`),
  ].join("\n");
}

async function callOpenAI(
  apiKey: string,
  context: string,
  flags: Flag[],
): Promise<{ recommendations: RawRec[] }> {
  const flagKeys = flags.map((f) => f.key);

  const systemPrompt =
    `You are an experienced choral director coaching another director on stabilizing their ensemble. ` +
    `You will be given one snapshot of ensemble health metrics and a fixed list of high-severity flags. ` +
    `Your job: produce exactly one recommendation per flag, ranked by impact (rank 1 = highest). ` +
    `Each recommendation must reference exactly one flag_key from the provided list. ` +
    `Steps must be concrete, this-week actions a director can actually take, not platitudes. ` +
    `Reply with strict JSON only — no prose, no markdown.`;

  const userPrompt =
    `${context}\n\n` +
    `Allowed flag_key values (one per recommendation, no duplicates, no others):\n${flagKeys.map((k) => `- ${k}`).join("\n")}\n\n` +
    `Schema:\n` +
    `{\n` +
    `  "recommendations": [\n` +
    `    {\n` +
    `      "rank": 1,\n` +
    `      "flag_key": "<one of the allowed keys>",\n` +
    `      "title": "<short imperative phrase>",\n` +
    `      "rationale": "<1–2 sentences explaining why this matters now>",\n` +
    `      "steps": ["<step 1>", "<step 2>", "<step 3>"],\n` +
    `      "owner_hint": "<who in the ensemble usually owns this, e.g. section leader>"\n` +
    `    }\n` +
    `  ]\n` +
    `}`;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
  }

  const body = await resp.json();
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");

  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.recommendations)) {
    throw new Error("model output missing recommendations array");
  }
  return parsed;
}

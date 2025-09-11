// Deno / Supabase Edge Function
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // bypass RLS inside function
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, apollographql-client-name, apollographql-client-version, cache-control, pragma",
};

function J(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json().catch(() => null);
    if (!body) return J(400, { error: "invalid_json" });

    const { student_id, assignment_id, journal_text, rubric } = body as {
      student_id?: string; assignment_id?: string; journal_text?: string; rubric?: unknown;
    };
    if (!student_id || !assignment_id || !journal_text) {
      return J(422, { error: "missing_fields", details: { student_id: !!student_id, assignment_id: !!assignment_id, journal_text: !!journal_text } });
    }
    if (!OPENAI_API_KEY) return J(500, { error: "missing_openai_key" });

    // Call OpenAI with a stable model
    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a rubric grader. Return JSON with {overall_score:number, feedback:string}." },
          { role: "user", content: `Journal:\n${journal_text}\nRubric:\n${JSON.stringify(rubric ?? {})}` }
        ],
        temperature: 0.2,
        max_tokens: 400
      })
    });

    if (!aiResp.ok) {
      const err = await aiResp.text().catch(() => "");
      return J(502, { error: "openai_failed", status: aiResp.status, body: err });
    }

    const ai = await aiResp.json();
    // Parse model output later. For now store deterministic values to prove DB path.
    const feedback = ai?.choices?.[0]?.message?.content ?? "No feedback";
    const overall_score = 100;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const { error: insErr } = await supabase
      .from("mus240_journal_grades")
      .insert([{
        student_id,
        assignment_id,      // text like "lj2"
        overall_score,
        feedback,
        graded_at: new Date().toISOString(),
        graded_by: "edge/grade-journal"
        // do not set created_at/updated_at here
      }]);

    if (insErr) {
      return J(500, { error: "db_insert_failed", code: insErr.code, details: insErr.details, hint: insErr.hint, message: insErr.message });
    }

    return J(200, { ok: true, overall_score, feedback });
  } catch (e) {
    return J(500, { error: "unhandled", message: e?.message ?? String(e) });
  }
});
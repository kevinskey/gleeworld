import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function chat(system: string, user: string, maxTokens = 500): Promise<string> {
  const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const apiKey = DEEPSEEK_API_KEY || OPENAI_API_KEY;
  if (!apiKey) throw new Error("No AI API key configured");
  const apiUrl = DEEPSEEK_API_KEY ? "https://api.deepseek.com/chat/completions" : "https://api.openai.com/v1/chat/completions";
  const model = DEEPSEEK_API_KEY ? "deepseek-chat" : "gpt-4o-mini";
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });
  if (!res.ok) throw new Error(`AI API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

const LEVEL_TONE: Record<number, string> = {
  1: "an elementary school student (grades 2-5). Use very simple words, short sentences, and a friendly encouraging tone.",
  2: "a middle school student. Be clear and encouraging, avoid jargon unless you define it.",
  3: "a high school student preparing for AP Music Theory. Be precise but supportive.",
  4: "a college music major. Be concise and technically accurate.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  try {
    const action = body.action as string;

    if (action === "explain") {
      const { prompt, choices, correct, chosen, level } = body as {
        prompt: string; choices?: string[]; correct: string; chosen: string; level?: number;
      };
      if (!prompt || !correct || !chosen) return json({ error: "Missing fields" }, 400);
      const tone = LEVEL_TONE[Number(level) || 2] ?? LEVEL_TONE[2];
      const text = await chat(
        `You are a music theory tutor explaining a missed quiz question to ${tone} Respond with ONE short paragraph (3-5 sentences). Explain why the correct answer is right and, if helpful, why their answer was a tempting mistake. Never scold.`,
        `Question: ${prompt}\n${choices?.length ? `Choices: ${choices.join(", ")}\n` : ""}Correct answer: ${correct}\nStudent's answer: ${chosen}`,
        300,
      );
      return json({ text });
    }

    if (action === "placement-summary") {
      const { perLevel, placedLevel } = body as {
        perLevel: { level: number; correct: number; total: number; pct: number }[];
        placedLevel: number;
      };
      if (!Array.isArray(perLevel)) return json({ error: "Missing perLevel" }, 400);
      const text = await chat(
        "You are a music theory placement advisor writing a 2-3 sentence summary for a choir director about a student's placement test. Name concrete strengths and weaknesses based on the per-level scores (Level 1 elementary fundamentals, Level 2 middle school notation/keys/intervals, Level 3 AP-level harmony, Level 4 college theory). Plain prose, no markdown.",
        `Placement: start at Level ${placedLevel}. Scores: ${perLevel.map((l) => `Level ${l.level}: ${l.correct}/${l.total} (${l.pct}%)`).join(", ")}`,
        200,
      );
      return json({ text });
    }

    if (action === "generate") {
      // Generates validated multiple-choice questions and stores them on a lesson.
      const { lessonId, topic, count, level } = body as { lessonId: string; topic: string; count?: number; level?: number };
      if (!lessonId || !topic) return json({ error: "Missing lessonId/topic" }, 400);
      const n = Math.min(Number(count) || 6, 12);
      const raw = await chat(
        `You write music theory multiple-choice questions for ${LEVEL_TONE[Number(level) || 2]} Return ONLY a JSON array, no prose, where each item is {"p": "question text", "c": "correct answer", "w": ["wrong1","wrong2","wrong3"], "e": "one-sentence explanation"}. Questions must be factually correct and unambiguous.`,
        `Write ${n} questions about: ${topic}`,
        1800,
      );
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) return json({ error: "AI returned no JSON array" }, 502);
      let items: unknown;
      try {
        items = JSON.parse(match[0]);
      } catch {
        return json({ error: "AI returned invalid JSON" }, 502);
      }
      const valid = (items as Record<string, unknown>[]).filter(
        (q) =>
          typeof q.p === "string" && q.p.length > 0 &&
          typeof q.c === "string" && q.c.length > 0 &&
          Array.isArray(q.w) && q.w.length === 3 && q.w.every((x) => typeof x === "string") &&
          !(q.w as string[]).includes(q.c as string),
      );
      if (valid.length === 0) return json({ error: "No valid questions generated" }, 502);

      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const rows = valid.map((q) => ({
        lesson_id: lessonId,
        type: "multiple_choice",
        prompt: { p: q.p, w: q.w, e: q.e ?? null },
        answer: { c: q.c },
        difficulty: Number(level) || 2,
      }));
      const { error } = await admin.from("gw_theory_exercises").insert(rows);
      if (error) return json({ error: error.message }, 500);
      return json({ inserted: rows.length });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});

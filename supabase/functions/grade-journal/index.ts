import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

type RubricCriterion = { name: string; max_points: number; description?: string };
type Rubric = { criteria?: RubricCriterion[] };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // consider restricting to your domain in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function letterFromScore(score: number): string {
  // 17-point scale → letter grade bands (tune to taste)
  if (score >= 16.5) return "A+";
  if (score >= 15.5) return "A";
  if (score >= 14.5) return "A-";
  if (score >= 13.5) return "B+";
  if (score >= 12.5) return "B";
  if (score >= 11.5) return "B-";
  if (score >= 10.5) return "C+";
  if (score >= 9.5)  return "C";
  if (score >= 8.5)  return "C-";
  if (score >= 7.5)  return "D+";
  if (score >= 6.5)  return "D";
  if (score >= 5.5)  return "D-";
  return "F";
}

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Enforce POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Env checks
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Supabase environment not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (!openaiApiKey) {
    return new Response(JSON.stringify({ error: "OpenAI API key not configured." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Request body must be valid JSON." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { student_id, assignment_id, journal_text, rubric, journal_id } = body as {
      student_id?: string;
      assignment_id?: string;
      journal_text?: string;
      rubric?: Rubric;
      journal_id?: string;
    };

    // Basic validation
    if (!journal_text || typeof journal_text !== "string") {
      return new Response(JSON.stringify({ error: "No journal_text provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consistent word-count policy
    const wordCount = journal_text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 100) {
      return new Response(JSON.stringify({
        error: "Journal entry too short.",
        details: "Minimum 100 words required.",
        wordCount,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt (compact + deterministic structure)
    let gradingPrompt = `You are an expert music professor grading a student listening journal for MUS 240: African American Music.
Grade on a 17-point scale. Be constructive and specific.

If a rubric is present, follow it closely. If not, assess on:
- Musical analysis and terminology (0–6)
- Historical/cultural context (0–6)
- Writing quality (clarity, structure, evidence) (0–5)

Return ONLY a JSON object with keys: score (number, 0–17), feedback (string), letter_grade (string).
`;

    if (rubric && Array.isArray(rubric.criteria) && rubric.criteria.length) {
      gradingPrompt += `\nGRADING RUBRIC:\n`;
      (rubric.criteria as RubricCriterion[]).forEach((c) => {
        gradingPrompt += `- ${c.name} (${c.max_points} pts)${c.description ? `: ${c.description}` : ""}\n`;
      });
    }

    gradingPrompt += `\nJOURNAL ENTRY:\n${journal_text}`;

    // OpenAI call
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an expert music professor. Always return valid JSON only, with no extra text.",
          },
          { role: "user", content: gradingPrompt },
        ],
        max_tokens: 800,
        temperature: 0.2,
      }),
    });

    if (!openaiResp.ok) {
      const details = await openaiResp.text().catch(() => "Unknown error");
      return new Response(JSON.stringify({ error: "OpenAI API error", details }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await openaiResp.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";

    // Parse JSON safely
    let gradingResult: { score?: number; feedback?: string; letter_grade?: string } = {};
    try {
      gradingResult = JSON.parse(raw);
    } catch {
      // Minimal fallback based on word count
      const fallbackScore = Math.min(Math.max(Math.floor(wordCount / 20), 8), 17);
      gradingResult = {
        score: fallbackScore,
        feedback:
          "Fallback grading applied due to invalid AI response. Your journal shows engagement; expand musical terminology, strengthen historical context, and clarify structure.",
        letter_grade: letterFromScore(fallbackScore),
      };
    }

    // Normalize and guard the result
    const score = Math.max(0, Math.min(17, Number(gradingResult.score ?? 0)));
    const letter = gradingResult.letter_grade || letterFromScore(score);
    const feedback =
      typeof gradingResult.feedback === "string" && gradingResult.feedback.trim().length
        ? gradingResult.feedback.trim()
        : "Thank you for your submission. Please see rubric and course guidance for areas to strengthen.";

    // Save to DB
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Requires a unique constraint on (student_id, assignment_id) for onConflict to work
    const { error: upsertError } = await supabase
      .from("mus240_journal_grades")
      .upsert(
        {
          student_id,
          assignment_id,
          journal_id,
          overall_score: score,
          letter_grade: letter,
          feedback: feedback,
          graded_at: new Date().toISOString(),
          ai_model: "gpt-4o-mini",
        },
        { onConflict: "student_id,assignment_id" },
      );

    if (upsertError) {
      return new Response(
        JSON.stringify({ error: "Failed to save grade", details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        grade: { score, letter_grade: letter, feedback },
        message: "Journal graded successfully",
        wordCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
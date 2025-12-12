import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type MidtermSubmission = {
  id: string;
  user_id: string;
  comprehensive_feedback: string | null;
  feedback_generated_at: string | null;
};

type Profile = {
  user_id: string;
  full_name?: string | null;
  first_name?: string | null;
};

type GradeRow = {
  id: string;
  submission_id: string;
  question_type: "term_definition" | "listening_analysis" | "essay";
  ai_score: number | null;
  created_at?: string | null;
};

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: corsHeaders,
    ...init,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!openAIApiKey) {
    return json({ error: "OpenAI API key not configured" }, { status: 500 });
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    return json({ error: "Supabase config missing" }, { status: 500 });
  }

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse body & query param
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const url = new URL(req.url);
    const submissionId =
      body.submissionId ??
      body.submission_id ??
      body.id ??
      url.searchParams.get("submissionId");

    if (!submissionId) {
      return json(
        { error: "Missing submissionId (body: submissionId/submission_id) or query ?submissionId=" },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch submission
const { data: submissions, error: subErr } =
      await supabase.from("mus240_midterm_submissions").select("*").eq("id", submissionId);
    if (subErr) {
      console.error("Fetch submission error:", subErr);
      return json({ error: "Failed to fetch submission" }, { status: 500 });
    }
    const submission = submissions?.[0];
    if (!submission) return json({ error: "Submission not found" }, { status: 404 });

    // Fetch profile
    const { data: profiles } = await supabase
      .from("gw_profiles")
      .select("*")
      .eq("user_id", submission.user_id)
      .limit(1);
    const profile = (profiles as Profile[] | null)?.[0] ?? null;

    // Fetch grades
const { data: grades, error: gradeErr } = await supabase
      .from("mus240_midterm_question_grades")
      .select("*")
      .eq("submission_id", submissionId);
    if (gradeErr) {
      console.error("Fetch grades error:", gradeErr);
      return json({ error: "Failed to fetch grades" }, { status: 500 });
    }

    // Group & cap by rubric
    const byType = {
      term_definition: (grades ?? [])
        .filter((g) => g.question_type === "term_definition")
        .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "")),
      listening_analysis: (grades ?? [])
        .filter((g) => g.question_type === "listening_analysis")
        .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "")),
      essay: (grades ?? [])
        .filter((g) => g.question_type === "essay")
        .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "")),
    };

    const pickScores = (rows: GradeRow[], limit: number) =>
      rows.slice(0, limit).map((r) => Number.isFinite(r.ai_score ?? NaN) ? (r.ai_score as number) : 0);

    const selected = {
      term_definition: pickScores(byType.term_definition, 4),
      listening_analysis: pickScores(byType.listening_analysis, 3),
      essay: pickScores(byType.essay, 1),
    };

    const sum = (arr: number[]) => arr.reduce((s, n) => s + n, 0);
    const termScore = sum(selected.term_definition);
    const excerptScore = sum(selected.listening_analysis);
    const essayScore = sum(selected.essay);
    const finalGrade = termScore + excerptScore + essayScore;

    // Rubric maxima
    const termMax = 40;
    const excerptMax = 30;
    const essayMax = 20;
    const totalMax = 100;

    const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);
    const termPercentage = pct(termScore, termMax);
    const excerptPercentage = pct(excerptScore, excerptMax);
    const essayPercentage = pct(essayScore, essayMax);
    const overallPercentage = pct(finalGrade, totalMax);

    const studentName = profile?.full_name || profile?.first_name || "the student";

    const prompt = `Return only a writing evaluation for ${studentName}'s midterm essay.

EXAM SCORES:
- Essay: ${essayScore}/${essayMax} (${essayPercentage.toFixed(1)}%)

Instructions:
- Focus solely on WRITING EVALUATION based on the essay score and observed writing quality (clarity, organization, coherence, use of evidence, and mechanics).
- Do not mention terms or listening sections.
- Do not include advice, suggestions, strengths, weaknesses, improvement areas, or recommendations.
- Do not include AI detection or any other sections.
- Output format must be exactly:

WRITING EVALUATION:\n<2–4 sentences evaluating writing quality only>

- No bullet points.
- Keep under 120 words.`;

    // OpenAI call with timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an experienced music professor providing constructive feedback on student midterm exams.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
      }),
      signal: controller.signal,
    }).catch((e) => {
      throw new Error(`OpenAI fetch failed: ${e?.message ?? e}`);
    });
    clearTimeout(timer);

    if (!aiResp.ok) {
      const text = await aiResp.text().catch(() => "");
      console.error("OpenAI API error:", aiResp.status, aiResp.statusText, text);
      return json({ error: "OpenAI API error", detail: text }, { status: 502 });
    }

    const aiJson = await aiResp.json();
    let generatedFeedback: string = aiJson?.choices?.[0]?.message?.content ?? "";

    // Enforce writing-only output
    const sanitizeWritingOnly = (txt: string) => {
      try {
        let t = txt || '';
        t = t.replace(/^#+.*$/gm, '').replace(/^\s*[-*]\s+/gm, '');
        const sectionMatch = t.match(/WRITING EVALUATION:\s*([\s\S]*)/i);
        let body = sectionMatch ? sectionMatch[1] : t;
        body = body
          .replace(/AI DETECTION[\s\S]*/i, '')
          .replace(/ACTIONABLE RECOMMENDATIONS[\s\S]*/i, '')
          .replace(/PERFORMANCE SUMMARY[\s\S]*/i, '')
          .replace(/DETAILED STRENGTHS[\s\S]*/i, '')
          .replace(/STRENGTHS[\s\S]*/i, '')
          .replace(/IMPROVEMENT AREAS[\s\S]*/i, '')
          .replace(/RECOMMENDATIONS[\s\S]*/i, '');
        const words = body.split(/\s+/).filter(Boolean);
        if (words.length > 120) {
          body = words.slice(0, 120).join(' ') + '…';
        }
        return `WRITING EVALUATION:\n${body.trim()}`;
      } catch {
        return `WRITING EVALUATION:\n${(txt || '').trim()}`;
      }
    };

    generatedFeedback = sanitizeWritingOnly(generatedFeedback);
    // Persist feedback
    const { error: updateErr } = await supabase
      .from("mus240_midterm_submissions")
      .update({
        comprehensive_feedback: generatedFeedback,
        feedback_generated_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (updateErr) {
      console.error("Save feedback error:", updateErr);
      return json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return json({
      success: true,
      feedback: generatedFeedback,
      scores: {
        terms: `${termScore}/${termMax}`,
        listening: `${excerptScore}/${excerptMax}`,
        essay: `${essayScore}/${essayMax}`,
        total: `${finalGrade}/${totalMax}`,
      },
      percentages: {
        terms: Number(termPercentage.toFixed(1)),
        listening: Number(excerptPercentage.toFixed(1)),
        essay: Number(essayPercentage.toFixed(1)),
        total: Number(overallPercentage.toFixed(1)),
      },
      submissionId,
    });
  } catch (err: any) {
    console.error("Unhandled error:", err);
    return json(
      { success: false, error: err?.message ?? "Failed to generate comprehensive feedback" },
      { status: 500 },
    );
  }
});
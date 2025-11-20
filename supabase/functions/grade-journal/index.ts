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

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    console.log('Grade journal function called');
    
    let body: any = {};
    try {
      body = await req.json();
    } catch (err) {
      console.error('JSON parsing error:', err);
      return new Response(JSON.stringify({ error: "Request body must be valid JSON." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('Request body keys:', Object.keys(body));

    const { student_id, assignment_id, journal_text, rubric, journal_id } = body as {
      student_id?: string;
      assignment_id?: string;
      journal_text?: string;
      rubric?: Rubric;
      journal_id?: string;
    };

    // Basic validation
    if (!journal_text || typeof journal_text !== "string") {
      console.error('Missing or invalid journal_text');
      return new Response(JSON.stringify({ error: "No journal_text provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consistent word-count policy
    const wordCount = journal_text.trim().split(/\s+/).filter(Boolean).length;
    console.log('Word count:', wordCount);
    
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

    // Check if already graded - only return existing grade if it's valid (has non-zero score)
    if (journal_id) {
      const existing = await supabase
        .from('mus240_journal_grades')
        .select('journal_id,overall_score,letter_grade,ai_feedback,graded_at,ai_model,rubric')
        .eq('journal_id', journal_id)
        .maybeSingle();
      
      // Only return existing grade if it has a valid score (not corrupted with 0 points)
      if (existing.data && existing.data.overall_score > 0) {
        console.log('Valid existing grade found, returning it');
        return new Response(
          JSON.stringify({
            success: true,
            alreadyGraded: true,
            grade: {
              journal_id,
              overall_score: existing.data.overall_score,
              letter_grade: existing.data.letter_grade,
              feedback: existing.data.ai_feedback,
              graded_at: existing.data.graded_at,
              ai_model: existing.data.ai_model,
              rubric: existing.data.rubric,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (existing.data) {
        console.log('Found corrupted grade with 0 score, will regrade');
      }
    }

    // Build prompt (compact + deterministic structure)
    let gradingPrompt = `You are an expert music professor grading a student listening journal for MUS 240: African American Music.

RETURN A JSON OBJECT with these keys:
- "rubric_scores": array of objects, each with { "criterion": string, "score": number, "maxScore": number, "feedback": string }
- "overall_feedback": string (overall comments on the journal)
- "letter_grade": string (A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F)

Be constructive and specific in your feedback.
`;

    if (rubric && Array.isArray(rubric.criteria) && rubric.criteria.length) {
      gradingPrompt += `\nGRADE ACCORDING TO THIS RUBRIC:\n`;
      (rubric.criteria as RubricCriterion[]).forEach((c) => {
        gradingPrompt += `- ${c.name} (max ${c.max_points} pts)${c.description ? `: ${c.description}` : ""}\n`;
      });
    } else {
      gradingPrompt += `\nGRADE USING THESE DEFAULT CRITERIA:\n`;
      gradingPrompt += `- Musical Analysis (max 7 pts): Identifies genre, style traits, and musical features\n`;
      gradingPrompt += `- Historical Context (max 5 pts): Connects musical features to historical and cultural significance\n`;
      gradingPrompt += `- Terminology Usage (max 3 pts): Uses correct musical terminology appropriately\n`;
      gradingPrompt += `- Writing Quality (max 2 pts): Clear, organized writing with proper grammar and 250-300 words\n`;
    }

    gradingPrompt += `\nJOURNAL ENTRY:\n${journal_text}`;


    console.log('Making OpenAI API call...');
    
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
      console.error('OpenAI API error:', openaiResp.status, details);
      return new Response(JSON.stringify({ error: "OpenAI API error", details }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await openaiResp.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    
    console.log('OpenAI response received, parsing...');

    // Parse JSON safely
    let gradingResult: { 
      rubric_scores?: Array<{criterion: string; score: number; maxScore: number; feedback: string}>; 
      overall_feedback?: string; 
      letter_grade?: string;
    } = {};
    
    try {
      gradingResult = JSON.parse(raw);
      console.log('Successfully parsed AI grading:', {
        rubric_scores_count: gradingResult.rubric_scores?.length,
        has_feedback: !!gradingResult.overall_feedback,
        letter_grade: gradingResult.letter_grade
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw content:', raw);
      // Fallback with default rubric
      const fallbackScore = Math.min(Math.max(Math.floor(wordCount / 20), 8), 17);
      gradingResult = {
        rubric_scores: [
          { criterion: "Musical Analysis", score: 4, maxScore: 7, feedback: "Shows basic understanding of musical elements." },
          { criterion: "Historical Context", score: 3, maxScore: 5, feedback: "Provides some historical context." },
          { criterion: "Terminology Usage", score: 2, maxScore: 3, feedback: "Uses some musical terminology." },
          { criterion: "Writing Quality", score: 1, maxScore: 2, feedback: "Writing is generally clear." }
        ],
        overall_feedback: "Fallback grading applied. Expand musical terminology, strengthen historical context, and clarify structure.",
        letter_grade: letterFromScore(fallbackScore),
      };
      console.log('Using fallback grading');
    }

    // Calculate total score from rubric_scores
    const rubricScores = gradingResult.rubric_scores || [];
    const totalScore = rubricScores.reduce((sum, item) => sum + item.score, 0);
    const maxPossible = rubricScores.reduce((sum, item) => sum + item.maxScore, 0) || 20;

    // All journal assignments use a 20-point scale
    const assignmentMaxPoints = 20;

    // Normalize rubric total to the 20-point grading scale
    const normalizedScore = maxPossible > 0
      ? (totalScore / maxPossible) * assignmentMaxPoints
      : 0;

    // Round to 2 decimal places
    const dbScore = Math.round(normalizedScore * 100) / 100;

    const letter = gradingResult.letter_grade || letterFromScore(totalScore);
    const feedback = gradingResult.overall_feedback || "Thank you for your submission.";

    // Save to DB
    console.log('Saving grade to database:', {
      student_id,
      assignment_id,
      journal_id,
      rubric_total: totalScore,
      rubric_max: maxPossible,
      assignment_max_points: assignmentMaxPoints,
      normalized_score: dbScore,
      letter_grade: letter,
      rubric_items: rubricScores.length
    });

    // Check if grade already exists for this journal
    const { data: existingGrade } = await supabase
      .from("mus240_journal_grades")
      .select("id")
      .eq("journal_id", journal_id)
      .maybeSingle();

    const gradeData = {
      student_id,
      assignment_id,
      journal_id,
      overall_score: dbScore,
      letter_grade: letter,
      ai_feedback: feedback,
      graded_at: new Date().toISOString(),
      ai_model: "gpt-4o-mini",
      rubric: {
        criteria: rubric,
        scores: rubricScores
      },
    };

    let saveError;
    if (existingGrade) {
      // Update existing grade
      console.log('Updating existing grade for journal:', journal_id);
      const { error } = await supabase
        .from("mus240_journal_grades")
        .update(gradeData)
        .eq("journal_id", journal_id);
      saveError = error;
    } else {
      // Insert new grade
      console.log('Inserting new grade for journal:', journal_id);
      const { error } = await supabase
        .from("mus240_journal_grades")
        .insert(gradeData);
      saveError = error;
    }

    if (saveError) {
      console.error('Database save error:', saveError);
      return new Response(
        JSON.stringify({ error: "Failed to save grade", details: saveError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        overall_score: dbScore,
        letter_grade: letter,
        feedback,
        rubric_scores: rubricScores,
        message: "Journal graded successfully",
        wordCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
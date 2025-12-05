import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

type RubricCriterion = { name: string; max_points: number; description?: string };
type Rubric = { criteria?: RubricCriterion[] };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // consider restricting to your domain in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function letterFromScore(percentage: number): string {
  // Convert percentage to letter grade
  if (percentage >= 97) return "A+";
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
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

    // If journal_id is provided, fetch the journal content
    let finalJournalText = journal_text;
    let finalStudentId = student_id;
    
    if (journal_id && !journal_text) {
      console.log('Fetching journal content for journal_id:', journal_id);
      const { data: journalData, error: journalError } = await supabase
        .from('mus240_journal_entries')
        .select('content, student_id')
        .eq('id', journal_id)
        .single();
      
      if (journalError) {
        console.error('Error fetching journal:', journalError);
        return new Response(JSON.stringify({ error: "Failed to fetch journal content.", details: journalError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (!journalData) {
        return new Response(JSON.stringify({ error: "Journal not found." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      finalJournalText = journalData.content;
      finalStudentId = journalData.student_id;
      console.log('Fetched journal text length:', finalJournalText?.length || 0);
    }

    // Basic validation
    if (!finalJournalText || typeof finalJournalText !== "string" || !finalJournalText.trim()) {
      console.error('Missing or invalid journal_text:', { 
        received: finalJournalText,
        type: typeof finalJournalText,
        isEmpty: !finalJournalText,
        isWhitespace: finalJournalText ? !finalJournalText.trim() : 'n/a'
      });
      return new Response(JSON.stringify({ error: "No journal_text found." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check word count - if too short, give 0 grade instead of error
    const wordCount = finalJournalText.trim().split(/\s+/).filter(Boolean).length;
    console.log('Word count:', wordCount);
    
    let gradingResult: { 
      rubric_scores?: Array<{criterion: string; score: number; maxScore: number; feedback: string}>; 
      overall_feedback?: string; 
      letter_grade?: string;
    } = {};
    
    if (wordCount < 50) {
      console.log('✅ NEW CODE: Journal too short, assigning 0 grade (not returning error)');
      gradingResult = {
        rubric_scores: [
          { criterion: "Musical Analysis", score: 0, maxScore: 7, feedback: "Entry too short to evaluate musical analysis." },
          { criterion: "Historical Context", score: 0, maxScore: 5, feedback: "Entry too short to evaluate historical context." },
          { criterion: "Terminology Usage", score: 0, maxScore: 3, feedback: "Entry too short to evaluate terminology usage." },
          { criterion: "Writing Quality", score: 0, maxScore: 2, feedback: "Entry does not meet minimum word count requirement." }
        ],
        overall_feedback: `This journal entry is too short (${wordCount} words). The assignment requires a minimum of 50 words to demonstrate understanding of the musical concepts. Please revise and expand your analysis to include specific musical elements, historical context, and personal reflection.`,
      };
      
      // Skip AI grading and jump to saving the 0 grade
    } else {

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

      gradingPrompt += `\nJOURNAL ENTRY:\n${finalJournalText}`;


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
      try {
        gradingResult = JSON.parse(raw);
        console.log('Successfully parsed AI grading:', {
          rubric_scores_count: gradingResult.rubric_scores?.length,
          has_feedback: !!gradingResult.overall_feedback,
          letter_grade: gradingResult.letter_grade
        });
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Raw content:', raw);
        // Fallback with default rubric (totals to 17 points, then normalized to 20)
        gradingResult = {
          rubric_scores: [
            { criterion: "Musical Analysis", score: 4, maxScore: 7, feedback: "Shows basic understanding of musical elements." },
            { criterion: "Historical Context", score: 3, maxScore: 5, feedback: "Provides some historical context." },
            { criterion: "Terminology Usage", score: 2, maxScore: 3, feedback: "Uses some musical terminology." },
            { criterion: "Writing Quality", score: 1, maxScore: 2, feedback: "Writing is generally clear." }
          ],
          overall_feedback: "Fallback grading applied. Expand musical terminology, strengthen historical context, and clarify structure.",
        };
        console.log('Using fallback grading');
      }
    } // End of word count else block

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

    // Calculate percentage for letter grade
    const percentage = (dbScore / assignmentMaxPoints) * 100;
    const letter = gradingResult.letter_grade || letterFromScore(percentage);
    const feedback = gradingResult.overall_feedback || "Thank you for your submission.";
    
    // Map rubric scores to database format with correct field names
    const mappedRubricScores = rubricScores.map(item => ({
      criterion_name: item.criterion,
      score: item.score,
      max_points: item.maxScore,
      feedback: item.feedback
    }));

    // Save to DB
    console.log('Saving grade to database:', {
      student_id: finalStudentId,
      assignment_id,
      journal_id,
      rubric_total: totalScore,
      rubric_max: maxPossible,
      assignment_max_points: assignmentMaxPoints,
      normalized_score: dbScore,
      letter_grade: letter,
      rubric_items: rubricScores.length
    });

    // Use upsert to handle both insert and update in a single operation
    // This avoids race conditions and handles the unique constraints properly
    const gradeData = {
      student_id: finalStudentId,
      assignment_id,
      journal_id,
      overall_score: dbScore,
      letter_grade: letter,
      ai_feedback: feedback,
      graded_at: new Date().toISOString(),
      ai_model: "gpt-4o-mini",
      rubric: {
        criteria: rubric,
        scores: mappedRubricScores
      },
    };

    console.log('Upserting grade for journal:', journal_id, 'assignment:', assignment_id, 'student:', finalStudentId);
    
    const { error: saveError } = await supabase
      .from("mus240_journal_grades")
      .upsert(gradeData, {
        onConflict: 'journal_id',
        ignoreDuplicates: false
      });

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
        rubric_scores: mappedRubricScores,
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
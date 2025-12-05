import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { student_id, assignment_id, journal_text, journal_id, rubric } = body || {};

    if (!journal_id || !journal_text) {
      return new Response(JSON.stringify({ success: false, error: 'journal_id and journal_text are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('Missing LOVABLE_API_KEY');
      return new Response(JSON.stringify({ success: false, error: 'Server misconfigured: missing Lovable AI key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build grading prompt - all journals are worth 20 points
    const totalMax = 20;

    const userPrompt = `Grade this MUS240 listening journal RIGOROUSLY using the rubric. Return STRICT JSON only.

This is a COLLEGE-LEVEL music history course. Apply REAL academic standards:
- Excellence (A range) requires EXCEPTIONAL insight, analysis, and mastery
- Good work (B range) shows solid understanding with minor gaps
- Adequate (C range) meets basic requirements but lacks depth
- Below expectations (D/F) shows significant deficiencies

Rubric (max total ${totalMax}):
${JSON.stringify(rubric?.criteria || [
  { criterion: "Musical Analysis", max_score: 6, description: "Identifies musical elements (melody, harmony, rhythm, texture, timbre) with specific examples" },
  { criterion: "Historical Context", max_score: 6, description: "Demonstrates understanding of historical period, cultural significance, and context" },
  { criterion: "Writing Quality", max_score: 5, description: "Clear, organized, grammatically correct with proper terminology" }
])}

Student Journal Text:
"""${journal_text}"""

GRADING STANDARDS:
- A (90-100%): Exceptional analysis with sophisticated insights, accurate terminology, thorough historical context
- B (80-89%): Solid analysis with good understanding, mostly accurate, adequate context  
- C (70-79%): Basic analysis, some errors or gaps, minimal context
- D (60-69%): Significant gaps, limited understanding, poor organization
- F (<60%): Fails to demonstrate understanding or meet requirements

Be CRITICAL and SPECIFIC. Most student work should fall in B-C range. Reserve A grades for truly exceptional submissions.

Return JSON with this exact shape:
{
  "rubric_scores": [
    { "criterion": "Musical Analysis", "score": 0-6, "max_score": 6, "feedback": "specific feedback with examples from text" },
    { "criterion": "Historical Context", "score": 0-6, "max_score": 6, "feedback": "specific feedback" },
    { "criterion": "Writing Quality", "score": 0-5, "max_score": 5, "feedback": "specific feedback" }
  ],
  "overall_score": 0-${totalMax},
  "overall_feedback": "one paragraph explaining grade with specific strengths and weaknesses"
}`;
    // Call Lovable AI Gateway (using free Gemini model)
    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a rigorous college music professor who grades fairly but critically. Most students earn B or C grades. A grades are reserved for exceptional work. Apply real academic standards. Always return strict JSON per instructions.'
          },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    const aiData = await aiResp.json();
    const raw = aiData?.choices?.[0]?.message?.content ?? '';
    console.log('AI raw response length:', raw?.length || 0);

    // Parse JSON from response, even if wrapped in code fences
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw?.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch (e) { console.error('JSON parse failed (extracted):', e); }
      }
    }

    // Normalize rubric scores and overall
    const rawRubric = Array.isArray(parsed?.rubric_scores) ? parsed.rubric_scores : [];
    const rubric_scores = rawRubric.map((r: any) => {
      const max = typeof r?.max_score === 'number' ? r.max_score : 0;
      const sc = typeof r?.score === 'number' ? r.score : 0;
      const clamped = Math.max(0, Math.min(max, Math.round(sc)));
      return {
        criterion: String(r?.criterion ?? ''),
        score: clamped,
        max_score: max,
        feedback: String(r?.feedback ?? '')
      };
    });

    let overall_score = rubric_scores.reduce((s: number, r: any) => s + (r.score || 0), 0);
    overall_score = Math.round(Math.max(0, Math.min(totalMax, overall_score)));

    const overall_feedback = typeof parsed?.overall_feedback === 'string' ? parsed.overall_feedback : 'No feedback provided.';
    const pct = (overall_score / totalMax) * 100;
    const letter_grade = pct >= 97 ? 'A+' : pct >= 93 ? 'A' : pct >= 90 ? 'A-' : pct >= 87 ? 'B+' : pct >= 83 ? 'B' : pct >= 80 ? 'B-' : pct >= 77 ? 'C+' : pct >= 73 ? 'C' : pct >= 70 ? 'C-' : pct >= 67 ? 'D+' : pct >= 63 ? 'D' : pct >= 60 ? 'D-' : 'F';

    // Save to DB (upsert)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase env vars');
      return new Response(JSON.stringify({ success: false, error: 'Server misconfigured: missing Supabase env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const gradePayloadFull: Record<string, any> = {
      journal_id,
      student_id,
      assignment_id,
      overall_score,
      letter_grade,
      ai_feedback: overall_feedback,
      rubric: { criteria: rubric?.criteria || [], scores: rubric_scores },
      ai_model: 'google/gemini-2.5-flash',
      graded_at: new Date().toISOString(),
    };

    // Try full payload first
    let upsertError: any = null;
    let saved: any = null;

  const fullRes = await supabase
      .from('mus240_journal_grades')
      .upsert(gradePayloadFull, { onConflict: 'student_id,assignment_id' })
      .select()
      .maybeSingle();

    if (fullRes.error) {
      console.warn('Full upsert failed, retrying with minimal payload:', fullRes.error?.message);
      upsertError = fullRes.error;
      const minimalPayload = {
        journal_id,
        student_id,
        assignment_id,
        overall_score,
        ai_feedback: overall_feedback,
        graded_at: new Date().toISOString(),
      };
      const minRes = await supabase
        .from('mus240_journal_grades')
        .upsert(minimalPayload, { onConflict: 'student_id,assignment_id' })
        .select()
        .maybeSingle();
      if (minRes.error) {
        console.error('Minimal upsert failed:', minRes.error);
        return new Response(JSON.stringify({ success: false, error: minRes.error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      saved = minRes.data;
    } else {
      saved = fullRes.data;
    }

    return new Response(JSON.stringify({
      success: true,
      grade: {
        journal_id,
        overall_score,
        letter_grade,
        rubric_scores,
        feedback: overall_feedback,
        ai_model: 'google/gemini-2.5-flash',
        graded_at: saved?.graded_at || new Date().toISOString(),
      },
      assignment_id,
      student_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in grade-journal-ai:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
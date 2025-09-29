import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0/+esm';

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

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.error('Missing OPENAI_API_KEY');
      return new Response(JSON.stringify({ success: false, error: 'Server misconfigured: missing OpenAI key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build grading prompt
    const totalMax = (rubric?.criteria || []).reduce((sum: number, c: any) => sum + (c?.max_points || 0), 0) || 17;

    const userPrompt = `Grade the following MUS240 journal using the provided rubric. Return STRICT JSON only.
Rubric (max total ${totalMax}): ${JSON.stringify(rubric?.criteria || [])}
Student Journal Text:\n"""${journal_text}"""

Return JSON with this exact shape:
{
  "rubric_scores": [
    { "criterion": "Musical Analysis", "score": 0-6, "max_score": 6, "feedback": "string" },
    { "criterion": "Historical Context", "score": 0-6, "max_score": 6, "feedback": "string" },
    { "criterion": "Writing Quality", "score": 0-5, "max_score": 5, "feedback": "string" }
  ],
  "overall_score": 0-${totalMax},
  "overall_feedback": "one concise paragraph"
}`;

    // Call OpenAI (GPT-5 family uses max_completion_tokens, no temperature)
    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are a fair, transparent music professor. Always return strict JSON per instructions. Do not include prose outside JSON.'
          },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 800,
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

    const rubric_scores = Array.isArray(parsed?.rubric_scores) ? parsed.rubric_scores : [];
    let overall_score = typeof parsed?.overall_score === 'number' ? parsed.overall_score : rubric_scores.reduce((s: number, r: any) => s + (r?.score || 0), 0);
    overall_score = Math.max(0, Math.min(totalMax, overall_score));
    const overall_feedback = parsed?.overall_feedback || 'No feedback provided.';

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
      overall_score,
      letter_grade,
      feedback: overall_feedback,
      rubric: { criteria: rubric?.criteria || [], scores: rubric_scores },
      ai_model: 'gpt-5-mini-2025-08-07',
      graded_at: new Date().toISOString(),
    };

    // Try full payload first
    let upsertError: any = null;
    let saved: any = null;

    const fullRes = await supabase
      .from('mus240_journal_grades')
      .upsert(gradePayloadFull, { onConflict: 'journal_id' })
      .select()
      .maybeSingle();

    if (fullRes.error) {
      console.warn('Full upsert failed, retrying with minimal payload:', fullRes.error?.message);
      upsertError = fullRes.error;
      const minimalPayload = {
        journal_id,
        overall_score,
        feedback: overall_feedback,
        graded_at: new Date().toISOString(),
      };
      const minRes = await supabase
        .from('mus240_journal_grades')
        .upsert(minimalPayload, { onConflict: 'journal_id' })
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
        ai_model: 'gpt-5-mini-2025-08-07',
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
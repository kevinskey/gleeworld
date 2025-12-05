import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!openAIApiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('Starting comprehensive feedback generation');
    
    // Parse body robustly and support multiple field names
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }

    const url = new URL(req.url);
    const submissionId = body.submissionId || body.submission_id || body.id || url.searchParams.get('submissionId');

    if (!submissionId) {
      return new Response(JSON.stringify({ error: 'Missing submissionId in body (submissionId or submission_id) or as query param ?submissionId=' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing submission:', submissionId);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get submission data
    const { data: submissions, error: submissionError } = await supabase
      .from('mus240_midterm_submissions')
      .select('*')
      .eq('id', submissionId);

    if (submissionError || !submissions || submissions.length === 0) {
      console.error('Failed to fetch submission:', submissionError);
      return new Response(JSON.stringify({ error: 'Failed to fetch submission' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const submission = submissions[0];

    if (!submission) {
      console.error('Submission not found');
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const { data: profiles } = await supabase
      .from('gw_profiles')
      .select('*')
      .eq('user_id', submission.user_id);

    const profile = profiles?.[0] || null;

    // Get AI scores from the correct grades table 
    const { data: grades } = await supabase
      .from('mus240_submission_grades')
      .select('*')
      .eq('submission_id', submissionId);

    console.log('Raw grades from database:', grades);

    // Group grades by question type for rubric compliance
    const gradesByType = {
      term_definition: (grades || []).filter(g => g.question_type === 'term_definition').map(g => g.instructor_score || g.ai_score),
      listening_analysis: (grades || []).filter(g => g.question_type === 'listening_analysis').map(g => g.instructor_score || g.ai_score),
      essay: (grades || []).filter(g => g.question_type === 'essay').map(g => g.instructor_score || g.ai_score)
    };

    // Apply rubric limits: max 4 terms, 3 excerpts, 1 essay
    const selected = {
      term_definition: gradesByType.term_definition.slice(0, 4),
      listening_analysis: gradesByType.listening_analysis.slice(0, 3),
      essay: gradesByType.essay.slice(0, 1)
    };

    // Calculate totals
    const termScore = selected.term_definition.reduce((sum, score) => sum + (score || 0), 0);
    const excerptScore = selected.listening_analysis.reduce((sum, score) => sum + (score || 0), 0);
    const essayScore = selected.essay.reduce((sum, score) => sum + (score || 0), 0);
    const finalGrade = termScore + excerptScore + essayScore;
    
    console.log('Calculated scores (limited to rubric counts):', { 
      termScore,
      excerptScore,
      essayScore,
      finalGrade,
      selected,
      submissionId: submission.id 
    });

    // Standard midterm maximums
    const termMax = 40;
    const excerptMax = 30;
    const essayMax = 20;
    const totalMax = 100;
    
    // Calculate percentages
    const termPercentage = termMax > 0 ? (termScore / termMax) * 100 : 0;
    const excerptPercentage = excerptMax > 0 ? (excerptScore / excerptMax) * 100 : 0;
    const essayPercentage = essayMax > 0 ? (essayScore / essayMax) * 100 : 0;
    const overallPercentage = totalMax > 0 ? (finalGrade / totalMax) * 100 : 0;

    const studentName = profile?.full_name || profile?.first_name || 'the student';

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

    console.log('Calling OpenAI with prompt length:', prompt.length);

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an experienced music professor providing constructive feedback on student midterm exams.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let generatedFeedback = data?.choices?.[0]?.message?.content ?? '';

    // Enforce writing-only output
    const sanitizeWritingOnly = (txt: string) => {
      try {
        let t = txt || '';
        // remove markdown headings and bullets
        t = t.replace(/^#+.*$/gm, '').replace(/^\s*[-*]\s+/gm, '');
        // prefer explicit WRITING EVALUATION section if present
        const sectionMatch = t.match(/WRITING EVALUATION:\s*([\s\S]*)/i);
        let body = sectionMatch ? sectionMatch[1] : t;
        // strip any unwanted sections if the model added them
        body = body
          .replace(/AI DETECTION[\s\S]*/i, '')
          .replace(/ACTIONABLE RECOMMENDATIONS[\s\S]*/i, '')
          .replace(/PERFORMANCE SUMMARY[\s\S]*/i, '')
          .replace(/DETAILED STRENGTHS[\s\S]*/i, '')
          .replace(/STRENGTHS[\s\S]*/i, '')
          .replace(/IMPROVEMENT AREAS[\s\S]*/i, '')
          .replace(/RECOMMENDATIONS[\s\S]*/i, '');
        // cap length ~120 words
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

    console.log('Generated feedback length:', generatedFeedback.length);
    // Update submission with comprehensive feedback AND grade
    const { error: updateError } = await supabase
      .from('mus240_midterm_submissions')
      .update({
        comprehensive_feedback: generatedFeedback,
        feedback_generated_at: new Date().toISOString(),
        grade: finalGrade
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Failed to update submission with feedback:', updateError);
      throw new Error('Failed to save feedback');
    }

    console.log('Successfully generated comprehensive feedback');

    return new Response(JSON.stringify({ 
      success: true, 
      feedback: generatedFeedback,
      scores: {
        terms: `${termScore}/${termMax}`,
        listening: `${excerptScore}/${excerptMax}`,
        essay: `${essayScore}/${essayMax}`,
        total: `${finalGrade}/${totalMax}`
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in comprehensive feedback generation:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to generate comprehensive feedback' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

  if (!openAIApiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('Starting comprehensive feedback generation');
    
    const { submissionId } = await req.json();

    if (!submissionId) {
      return new Response(JSON.stringify({ error: 'Missing submissionId' }), {
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

    // Get AI scores from grades table
    const { data: grades } = await supabase
      .from('mus240_midterm_question_grades')
      .select('*')
      .eq('submission_id', submissionId);

    console.log('Raw grades from database:', grades);

    // Group grades by question type for rubric compliance
    const gradesByType = {
      term_definition: (grades || []).filter(g => g.question_type === 'term_definition').map(g => g.ai_score),
      listening_analysis: (grades || []).filter(g => g.question_type === 'listening_analysis').map(g => g.ai_score),
      essay: (grades || []).filter(g => g.question_type === 'essay').map(g => g.ai_score)
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

    const prompt = `Generate comprehensive feedback for ${studentName}'s midterm exam:

EXAM SCORES:
- Terms: ${termScore}/${termMax} (${termPercentage.toFixed(1)}%)
- Listening: ${excerptScore}/${excerptMax} (${excerptPercentage.toFixed(1)}%)  
- Essay: ${essayScore}/${essayMax} (${essayPercentage.toFixed(1)}%)
- Total: ${finalGrade}/${totalMax} (${overallPercentage.toFixed(1)}%)

RUBRIC CRITERIA:
- Term Definition Accuracy (10 points each, max 4 terms)
- Listening Analysis Quality (10 points each, max 3 excerpts)
- Essay Content & Organization (20 points total)

Generate structured feedback in these sections:
1. PERFORMANCE SUMMARY WITH RUBRIC BREAKDOWN - Analyze each section against specific rubric criteria
2. AI DETECTION ANALYSIS - Assess probability (0-100%) that AI was used with reasoning
3. DETAILED STRENGTHS AND IMPROVEMENT AREAS - Cite specific evidence from performance
4. ACTIONABLE RECOMMENDATIONS - Concrete steps for academic growth

Keep response under 500 words. Use the exact scores provided above.`;

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
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedFeedback = data.choices[0].message.content;

    console.log('Generated feedback length:', generatedFeedback.length);

    // Update submission with comprehensive feedback
    const { error: updateError } = await supabase
      .from('mus240_midterm_submissions')
      .update({
        comprehensive_feedback: generatedFeedback,
        feedback_generated_at: new Date().toISOString()
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
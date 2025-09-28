import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    // Get submission data
    const submissionUrl = `${supabaseUrl}/rest/v1/mus240_midterm_submissions?id=eq.${submissionId}&select=*`;
    const submissionResponse = await fetch(submissionUrl, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    });

    if (!submissionResponse.ok) {
      console.error('Failed to fetch submission');
      return new Response(JSON.stringify({ error: 'Failed to fetch submission' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const submissions = await submissionResponse.json();
    const submission = submissions[0];

    if (!submission) {
      console.error('Submission not found');
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const profileUrl = `${supabaseUrl}/rest/v1/gw_profiles?user_id=eq.${submission.user_id}&select=*`;
    const profileResponse = await fetch(profileUrl, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    });

    const profiles = await profileResponse.json();
    const profile = profiles?.[0] || null;

    // Get AI scores from grades table
    const gradesUrl = `${supabaseUrl}/rest/v1/mus240_midterm_question_grades?submission_id=eq.${submissionId}&select=*`;
    const gradesResponse = await fetch(gradesUrl, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    });

    let grades = [];
    if (gradesResponse.ok) {
      grades = await gradesResponse.json();
    }

    console.log('Raw grades from database:', grades);

    // Group grades by question type for rubric compliance
    const gradesByType = {
      term_definition: grades.filter(g => g.question_type === 'term_definition').map(g => g.ai_score),
      listening_analysis: grades.filter(g => g.question_type === 'listening_analysis').map(g => g.ai_score),
      essay: grades.filter(g => g.question_type === 'essay').map(g => g.ai_score)
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

    const prompt = `Generate feedback for ${studentName}'s midterm exam:

ACTUAL SCORES (use these exact numbers):
- Terms: ${termScore}/${termMax} (${termPercentage.toFixed(1)}%)
- Listening: ${excerptScore}/${excerptMax} (${excerptPercentage.toFixed(1)}%)
- Essay: ${essayScore}/${essayMax} (${essayPercentage.toFixed(1)}%)
- Total: ${finalGrade}/${totalMax} (${overallPercentage.toFixed(1)}%)

Generate structured feedback in 2 sections:
1. PERFORMANCE SUMMARY - Overview using ONLY the exact scores above
2. STRENGTHS - Two main areas of excellence

Keep feedback to 300 words maximum. Use only the scores provided above - do not modify them.`;

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
    const updateUrl = `${supabaseUrl}/rest/v1/mus240_midterm_submissions?id=eq.${submissionId}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comprehensive_feedback: generatedFeedback,
        feedback_generated_at: new Date().toISOString()
      })
    });

    if (!updateResponse.ok) {
      console.error('Failed to update submission with feedback');
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
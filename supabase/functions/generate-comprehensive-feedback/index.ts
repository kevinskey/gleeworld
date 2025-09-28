import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting comprehensive feedback generation');
    
    const body = await req.json().catch(() => null);
    if (!body || !body.submission_id) {
      return new Response(JSON.stringify({ error: 'submission_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const submissionId = body.submission_id;
    console.log('Processing submission:', submissionId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
      console.error('Missing configuration');
      return new Response(JSON.stringify({ error: 'Configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Get actual AI scores from the grades table
    const gradesResponse = await fetch(`${supabaseUrl}/rest/v1/mus240_submission_grades?submission_id=eq.${submissionId}&select=question_type,ai_score&order=created_at.desc`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Accept-Profile': 'public'
      }
    });
    
    let grades: any[] = [];
    if (!gradesResponse.ok) {
      const errText = await gradesResponse.text().catch(() => '');
      console.error('Failed to fetch grades', gradesResponse.status, errText);
    } else {
      grades = await gradesResponse.json();
    }
    console.log('Raw grades from database:', grades);

    // Select ONLY the latest N grades per section to match exam rubric
    const selected: { term_definition: number[]; listening_analysis: number[]; essay: number[] } = {
      term_definition: [],
      listening_analysis: [],
      essay: []
    };

    const LIMITS = { term_definition: 4, listening_analysis: 3, essay: 1 } as const;

    for (const g of grades as Array<{ question_type: string; ai_score: number }>) {
      const t = g.question_type as keyof typeof LIMITS;
      const score = Number(g.ai_score) || 0;
      if (t in LIMITS && selected[t].length < LIMITS[t]) {
        selected[t].push(score);
      }
    }

    // Sum up scores by category (already ordered desc by created_at)
    const termScore = (selected.term_definition || []).reduce((sum, s) => sum + s, 0);
    const excerptScore = (selected.listening_analysis || []).reduce((sum, s) => sum + s, 0);
    const essayScore = (selected.essay || []).reduce((sum, s) => sum + s, 0);
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
    const totalMax = 90;
    
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

Generate structured feedback in 5 sections:
1. PERFORMANCE SUMMARY - Overview using ONLY the exact scores above
2. STRENGTHS - Two main areas of excellence
3. IMPROVEMENTS - Two areas needing development
4. RESOURCES - Two specific study recommendations
5. ENCOURAGEMENT - Personal motivational note

Keep feedback to 600 words maximum. Use only the scores provided above - do not modify them.`;

    console.log('Calling OpenAI with prompt length:', prompt.length);

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an encouraging African American music history instructor. Use ONLY the exact scores provided - do not modify or recalculate them.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1200,
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI error:', openaiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiData = await openaiResponse.json();
    const feedback = openaiData?.choices?.[0]?.message?.content;
    
    if (!feedback) {
      console.error('No feedback generated');
      return new Response(JSON.stringify({ error: 'No feedback generated' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generated feedback length:', feedback.length);

    // Update submission
    const updateUrl = `${supabaseUrl}/rest/v1/mus240_midterm_submissions?id=eq.${submissionId}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comprehensive_feedback: feedback,
        feedback_generated_at: new Date().toISOString(),
      })
    });

    if (!updateResponse.ok) {
      console.error('Update failed:', await updateResponse.text());
    }

    console.log('Successfully generated comprehensive feedback');

    return new Response(JSON.stringify({ 
      success: true, 
      feedback: feedback,
      section_scores: {
        terms: { score: termScore, max: termMax, percentage: termPercentage },
        excerpts: { score: excerptScore, max: excerptMax, percentage: excerptPercentage },
        essay: { score: essayScore, max: essayMax, percentage: essayPercentage },
        overall: { score: finalGrade, max: totalMax, percentage: overallPercentage }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: error?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
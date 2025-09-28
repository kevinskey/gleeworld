import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse body safely
    const body = await req.json().catch(() => null);
    if (!body || !body.submission_id) {
      return new Response(JSON.stringify({ error: 'submission_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { submission_id } = body;

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Setup timeout for external requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Get submission data
      const submissionResponse = await fetch(`${supabaseUrl}/rest/v1/mus240_midterm_submissions?id=eq.${submission_id}&select=*`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        signal: controller.signal
      });

      if (!submissionResponse.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch submission' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const submissions = await submissionResponse.json();
      const submission = submissions[0];

      if (!submission) {
        return new Response(JSON.stringify({ error: 'Submission not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get existing grades
      const gradesResponse = await fetch(`${supabaseUrl}/rest/v1/mus240_submission_grades?submission_id=eq.${submission_id}&select=*`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        signal: controller.signal
      });

      if (!gradesResponse.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch grades' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const grades = await gradesResponse.json();

      // Get user profile
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/gw_profiles?user_id=eq.${submission.user_id}&select=*`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        signal: controller.signal
      });

      const profiles = await profileResponse.json();
      const profile = profiles?.[0] || null;

      // Calculate scores safely with debugging
      const safeGrades = Array.isArray(grades) ? grades : [];
      console.log('Raw grades data:', safeGrades.length, 'grades found');
      
      const termGrades = safeGrades.filter((g: any) => g?.question_type === 'term_definition');
      const excerptGrades = safeGrades.filter((g: any) => g?.question_type === 'listening_analysis');
      const essayGrades = safeGrades.filter((g: any) => g?.question_type === 'essay');

      console.log('Grade breakdown:', {
        terms: termGrades.length,
        excerpts: excerptGrades.length, 
        essays: essayGrades.length
      });

      // Safe score calculation - ensure scores are reasonable numbers
      const parseScore = (score: any): number => {
        const parsed = parseFloat(score);
        return (isNaN(parsed) || parsed < 0 || parsed > 50) ? 0 : parsed; // Cap at 50 per question
      };

      const termScore = termGrades.reduce((sum: number, g: any) => {
        const score = parseScore(g?.ai_score);
        console.log('Term score:', g?.question_id, score);
        return sum + score;
      }, 0);
      
      const excerptScore = excerptGrades.reduce((sum: number, g: any) => {
        const score = parseScore(g?.ai_score);
        console.log('Excerpt score:', g?.question_id, score);
        return sum + score;
      }, 0);
      
      const essayScore = essayGrades.reduce((sum: number, g: any) => {
        const score = parseScore(g?.ai_score);
        console.log('Essay score:', g?.question_id, score);
        return sum + score;
      }, 0);

      console.log('Calculated scores:', { termScore, excerptScore, essayScore });

      const termMax = 40;
      const excerptMax = 30;
      const essayMax = 20;
      const totalScore = termScore + excerptScore + essayScore;
      const totalMax = 90;
      const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

      // Create concise feedback summary
      const gradeSummary = safeGrades.slice(0, 8).map((g: any) => {
        const feedback = g?.ai_feedback || 'No feedback';
        const truncatedFeedback = feedback.length > 100 ? feedback.substring(0, 100) + '...' : feedback;
        return `${g?.question_type || 'Unknown'}: ${g?.ai_score || 0} pts - ${truncatedFeedback}`;
      });

      const studentName = profile?.full_name || profile?.first_name || 'this student';

      const feedbackPrompt = `Generate feedback for ${studentName}'s midterm exam:

SCORES:
- Terms: ${termScore}/${termMax} (${((termScore/termMax)*100).toFixed(1)}%)
- Listening: ${excerptScore}/${excerptMax} (${((excerptScore/excerptMax)*100).toFixed(1)}%)
- Essay: ${essayScore}/${essayMax} (${((essayScore/essayMax)*100).toFixed(1)}%)
- Total: ${totalScore}/${totalMax} (${percentage.toFixed(1)}%)

KEY POINTS:
${gradeSummary.join('\n')}

Provide structured feedback (max 600 words):
1. PERFORMANCE SUMMARY - Brief overview of each section
2. STRENGTHS - Top 2 areas of excellence
3. IMPROVEMENTS - Top 2 areas needing work
4. RESOURCES - 2 study recommendations
5. ENCOURAGEMENT - Personal note with next steps`;

      // Call OpenAI with timeout
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You are an African American music history instructor. Provide encouraging, constructive feedback in a structured format.' 
            },
            { role: 'user', content: feedbackPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1200,
        }),
        signal: controller.signal
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('OpenAI API error:', aiResponse.status, errorText);
        return new Response(JSON.stringify({ error: 'AI service unavailable', details: errorText }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiResponse.json();
      const comprehensiveFeedback = aiData?.choices?.[0]?.message?.content;
      
      if (!comprehensiveFeedback) {
        return new Response(JSON.stringify({ error: 'Failed to generate feedback' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update submission with feedback
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/mus240_midterm_submissions?id=eq.${submission_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comprehensive_feedback: comprehensiveFeedback,
          feedback_generated_at: new Date().toISOString(),
        }),
        signal: controller.signal
      });

      if (!updateResponse.ok) {
        console.error('Update failed:', await updateResponse.text());
        // Continue even if update fails
      }

      return new Response(JSON.stringify({ 
        success: true, 
        feedback: comprehensiveFeedback,
        section_scores: {
          terms: { score: termScore, max: termMax, percentage: termMax > 0 ? (termScore/termMax)*100 : 0 },
          excerpts: { score: excerptScore, max: excerptMax, percentage: excerptMax > 0 ? (excerptScore/excerptMax)*100 : 0 },
          essay: { score: essayScore, max: essayMax, percentage: essayMax > 0 ? (essayScore/essayMax)*100 : 0 },
          overall: { score: totalScore, max: totalMax, percentage }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } finally {
      clearTimeout(timeout);
    }

  } catch (error: any) {
    console.error('Function error:', error);
    
    // Always return a valid JSON response to prevent 502
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: error?.message || 'Unknown error',
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
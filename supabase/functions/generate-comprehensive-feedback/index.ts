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
    const { submission_id } = await req.json();
    
    if (!submission_id) {
      return new Response(JSON.stringify({ error: 'submission_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase service configuration missing' }), {
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

    // Get submission data
    const submissionResponse = await fetch(`${supabaseUrl}/rest/v1/mus240_midterm_submissions?id=eq.${submission_id}&select=*`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    });

    if (!submissionResponse.ok) {
      const text = await submissionResponse.text();
      console.error('Failed to fetch submission:', submissionResponse.status, text);
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
      }
    });

    if (!gradesResponse.ok) {
      const text = await gradesResponse.text();
      console.error('Failed to fetch grades:', gradesResponse.status, text);
      return new Response(JSON.stringify({ error: 'Failed to fetch grades' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const grades = await gradesResponse.json();

    // Get user profile for personalization
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/gw_profiles?user_id=eq.${submission.user_id}&select=*`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    });

    const profiles = await profileResponse.json();
    const profile = profiles?.[0] || null;

    // Analyze grades by section
    const termGrades = Array.isArray(grades) ? grades.filter((g: any) => g.question_type === 'term_definition') : [];
    const excerptGrades = Array.isArray(grades) ? grades.filter((g: any) => g.question_type === 'listening_analysis') : [];
    const essayGrades = Array.isArray(grades) ? grades.filter((g: any) => g.question_type === 'essay') : [];

    // Calculate section scores
    const termScore = termGrades.reduce((sum: number, g: any) => sum + (g.ai_score || 0), 0);
    const termMax = 40; // 6 terms × 6-7 points each
    const excerptScore = excerptGrades.reduce((sum: number, g: any) => sum + (g.ai_score || 0), 0);
    const excerptMax = 30; // 3 excerpts × 10 points each
    const essayScore = essayGrades.reduce((sum: number, g: any) => sum + (g.ai_score || 0), 0);
    const essayMax = 20; // 1 essay × 20 points

    const totalScore = termScore + excerptScore + essayScore;
    const totalMax = 90;
    const percentage = (totalScore / totalMax) * 100;

    // Create comprehensive feedback prompt
    const feedbackPrompt = `As an expert African American music history instructor, generate comprehensive feedback for ${profile?.full_name || profile?.first_name || 'this student'}'s midterm exam performance.

STUDENT PERFORMANCE SUMMARY:
- Terms Section: ${termScore}/${termMax} points (${((termScore/termMax)*100).toFixed(1)}%)
- Listening Excerpts: ${excerptScore}/${excerptMax} points (${((excerptScore/excerptMax)*100).toFixed(1)}%)
- Essay: ${essayScore}/${essayMax} points (${((essayScore/essayMax)*100).toFixed(1)}%)
- Overall: ${totalScore}/${totalMax} points (${percentage.toFixed(1)}%)

INDIVIDUAL QUESTION FEEDBACK:
${(Array.isArray(grades) ? grades : []).map((g: any) => `
${g.question_id || 'Unknown'} (${g.question_type || 'Unknown'}): ${g.ai_score || 0} points
Student Answer: ${g.student_answer || 'No answer provided'}
AI Feedback: ${g.ai_feedback || 'No feedback available'}
`).join('\n')}

Please provide a comprehensive feedback report with the following sections:

1. **TERMS SECTION ANALYSIS** (${termScore}/${termMax} points)
   - Analyze performance across the term definitions
   - Highlight strongest definitions and areas needing improvement
   - Specific feedback on historical accuracy and contextual understanding

2. **LISTENING EXCERPTS ANALYSIS** (${excerptScore}/${excerptMax} points)
   - Evaluate their musical analysis skills
   - Comment on genre identification accuracy
   - Assess understanding of musical features and cultural context

3. **ESSAY ANALYSIS** (${essayScore}/${essayMax} points)
   - Evaluate argument structure and historical evidence
   - Comment on synthesis of course materials
   - Assess critical thinking and writing quality

4. **OVERALL STRENGTHS**
   - Identify 2-3 key areas where the student excelled
   - Highlight specific examples from their responses

5. **AREAS FOR GROWTH**
   - Identify 2-3 specific areas needing improvement
   - Provide concrete suggestions for improvement

6. **RESEARCH RECOMMENDATIONS**
   - Suggest 3-4 specific topics, scholars, or resources for further study
   - Tailor recommendations to their demonstrated interests and gaps
   - Include both historical and contemporary sources

7. **ENCOURAGEMENT & NEXT STEPS**
   - Personal encouragement acknowledging their effort and progress
   - Specific action items for continued learning
   - Connection to broader course goals and music history field

Format the response as a structured academic feedback report that is encouraging yet constructive.`;

    // Generate comprehensive feedback
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are Dr. Kevin Phillip Johnson, an expert African American music history instructor at Spelman College. You provide detailed, encouraging, and academically rigorous feedback that helps students grow. Your feedback is always constructive, specific, and connects to broader learning goals.' 
          },
          { role: 'user', content: feedbackPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const txt = await aiResponse.text();
      console.error('OpenAI API error:', aiResponse.status, txt);
      return new Response(JSON.stringify({ error: 'OpenAI API error', details: txt }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('OpenAI empty response:', aiData);
      return new Response(JSON.stringify({ error: 'Failed to generate comprehensive feedback' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const comprehensiveFeedback = content as string;

    // Update submission with comprehensive feedback
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
      })
    });

    if (!updateResponse.ok) {
      console.error('Error updating feedback:', await updateResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to store comprehensive feedback' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      feedback: comprehensiveFeedback,
      section_scores: {
        terms: { score: termScore, max: termMax, percentage: (termScore/termMax)*100 },
        excerpts: { score: excerptScore, max: excerptMax, percentage: (excerptScore/excerptMax)*100 },
        essay: { score: essayScore, max: essayMax, percentage: (essayScore/essayMax)*100 },
        overall: { score: totalScore, max: totalMax, percentage }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error generating comprehensive feedback:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
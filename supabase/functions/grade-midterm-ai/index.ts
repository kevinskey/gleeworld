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

    console.log('Grading submission:', submission_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get submission data
    const submissionResponse = await fetch(`${supabaseUrl}/rest/v1/mus240_midterm_submissions?id=eq.${submission_id}&select=*`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    });

    const submissions = await submissionResponse.json();
    const submission = submissions[0];

    if (!submission) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get rubrics
    const rubricsResponse = await fetch(`${supabaseUrl}/rest/v1/mus240_grading_rubrics?select=*`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      }
    });

    const rubrics = await rubricsResponse.json();
    const grades = [];

    // Grade each answer type
    const answerTypes = [
      { type: 'term_definition', id: 'ring_shout', answer: submission.ring_shout_answer },
      { type: 'term_definition', id: 'field_holler', answer: submission.field_holler_answer },
      { type: 'term_definition', id: 'negro_spiritual', answer: submission.negro_spiritual_answer },
      { type: 'term_definition', id: 'blues', answer: submission.blues_answer },
      { type: 'term_definition', id: 'ragtime', answer: submission.ragtime_answer },
      { type: 'term_definition', id: 'swing', answer: submission.swing_answer },
      { type: 'listening_analysis', id: 'excerpt_1', answer: `Genre: ${submission.excerpt_1_genre}\nFeatures: ${submission.excerpt_1_features}\nContext: ${submission.excerpt_1_context}` },
      { type: 'listening_analysis', id: 'excerpt_2', answer: `Genre: ${submission.excerpt_2_genre}\nFeatures: ${submission.excerpt_2_features}\nContext: ${submission.excerpt_2_context}` },
      { type: 'listening_analysis', id: 'excerpt_3', answer: `Genre: ${submission.excerpt_3_genre}\nFeatures: ${submission.excerpt_3_features}\nContext: ${submission.excerpt_3_context}` },
      { type: 'essay', id: 'essay_question', answer: submission.essay_answer }
    ];

    for (const answerType of answerTypes) {
      if (!answerType.answer || answerType.answer.trim() === '') {
        console.log(`Skipping ${answerType.id} - no answer provided`);
        continue;
      }

      const rubric = rubrics.find((r: any) => 
        r.question_type === answerType.type && 
        (r.question_id === answerType.id || 
         (answerType.type === 'listening_analysis' && r.question_id === 'excerpt_analysis') ||
         (answerType.type === 'essay' && r.question_id === 'essay_question'))
      );

      if (!rubric) {
        console.log(`No rubric found for ${answerType.type}:${answerType.id}`);
        continue;
      }

      console.log(`Grading ${answerType.id} with rubric:`, rubric.criteria);

      // Create AI grading prompt
      const prompt = createGradingPrompt(answerType, rubric);

      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert music instructor grading African American music history exam responses. Provide detailed, constructive feedback.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
          }),
        });

        const aiData = await aiResponse.json();
        
        if (!aiData.choices?.[0]?.message?.content) {
          console.error('Invalid AI response for', answerType.id, aiData);
          continue;
        }

        const gradingResult = parseGradingResponse(aiData.choices[0].message.content, rubric);
        console.log(`AI grading result for ${answerType.id}:`, gradingResult);

        // Store the grade
        const gradeData = {
          submission_id: submission_id,
          question_type: answerType.type,
          question_id: answerType.id,
          student_answer: answerType.answer,
          ai_score: gradingResult.score,
          ai_feedback: gradingResult.feedback,
          rubric_breakdown: JSON.stringify(gradingResult.breakdown),
          ai_graded_at: new Date().toISOString(),
        };

        const storeResponse = await fetch(`${supabaseUrl}/rest/v1/mus240_submission_grades`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(gradeData)
        });

        if (!storeResponse.ok) {
          console.error('Error storing grade:', await storeResponse.text());
        } else {
          grades.push({
            question_id: answerType.id,
            score: gradingResult.score,
            total_points: rubric.total_points,
            feedback: gradingResult.feedback
          });
        }

      } catch (error) {
        console.error(`Error grading ${answerType.id}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      grades_processed: grades.length,
      grades: grades 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in grade-midterm-ai function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createGradingPrompt(answerType: any, rubric: any): string {
  const criteriaText = Object.entries(rubric.criteria).map(([key, value]: [string, any]) => 
    `${key}: ${value.points} points - ${value.description}`
  ).join('\n');

  return `Grade this student's answer for a ${answerType.type} question about ${answerType.id}:

RUBRIC (Total: ${rubric.total_points} points):
${criteriaText}

STUDENT ANSWER:
${answerType.answer}

Please provide:
1. A score for each criterion (format: "criterion_name: X/Y points")
2. Overall score (format: "TOTAL: X/${rubric.total_points}")
3. Detailed feedback explaining the grade and suggestions for improvement

Focus on:
- Historical accuracy and context
- Understanding of musical elements
- Cultural significance and connections
- Quality of explanation and examples
- Areas for improvement`;
}

function parseGradingResponse(response: string, rubric: any): { score: number, feedback: string, breakdown: any } {
  const breakdown: any = {};
  let totalScore = 0;
  
  // Parse individual criterion scores
  Object.keys(rubric.criteria).forEach(criterion => {
    const pattern = new RegExp(`${criterion}:?\\s*(\\d+(?:\\.\\d+)?)\\/(\\d+)`, 'i');
    const match = response.match(pattern);
    if (match) {
      const score = parseFloat(match[1]);
      const maxPoints = parseFloat(match[2]);
      breakdown[criterion] = { score, max_points: maxPoints };
      totalScore += score;
    }
  });

  // Try to find total score if not calculated from criteria
  const totalMatch = response.match(/TOTAL:?\s*(\d+(?:\.\d+)?)\/(\d+)/i);
  if (totalMatch && totalScore === 0) {
    totalScore = parseFloat(totalMatch[1]);
  }

  return {
    score: totalScore,
    feedback: response,
    breakdown
  };
}
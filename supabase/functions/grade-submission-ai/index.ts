import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId, rubricCriteria } = await req.json();
    
    if (!submissionId) {
      throw new Error('Submission ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch submission with assignment details
    const { data: submission, error: subError } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        gw_assignments(
          title,
          description,
          points,
          rubric_criteria
        )
      `)
      .eq('id', submissionId)
      .single();

    if (subError) throw subError;

    // Use assignment rubric if available, otherwise use provided rubric
    const criteria = rubricCriteria || submission.gw_assignments?.rubric_criteria || [
      {
        name: "Content Quality",
        description: "Accuracy, depth, and relevance of content",
        maxPoints: 40
      },
      {
        name: "Analysis & Critical Thinking",
        description: "Demonstrates understanding and insightful analysis",
        maxPoints: 35
      },
      {
        name: "Communication",
        description: "Clarity, organization, and proper writing mechanics",
        maxPoints: 25
      }
    ];

    const totalMaxPoints = criteria.reduce((sum: number, c: any) => sum + c.maxPoints, 0);
    const contentText = submission?.file_url
      ? `File URL: ${submission.file_url}`
      : 'No inline content available';

    // Build AI grading prompt with detection
    const systemPrompt = `You are an expert educator providing fair, transparent, and defensible grading. 
Your evaluation must be:
- Evidence-based: cite specific examples from the submission
- Balanced: acknowledge strengths and areas for improvement
- Constructive: provide actionable feedback
- Mathematically sound: scores must add up correctly
- Vigilant: detect AI-generated content and academic dishonesty`;

    const userPrompt = `Grade this student submission using the rubric below AND analyze if it was AI-generated.

ASSIGNMENT: ${submission.gw_assignments?.title}
${submission.gw_assignments?.description ? `Description: ${submission.gw_assignments.description}` : ''}

STUDENT SUBMISSION:
${contentText}

RUBRIC CRITERIA:
${criteria.map((c: any, i: number) => `${i + 1}. ${c.name} (${c.maxPoints} points max)
   ${c.description}`).join('\n')}

TASKS:
1. Grade each criterion with evidence and feedback
2. Analyze for AI detection:
   - Look for generic, overly polished language
   - Unusually perfect grammar/structure for student level
   - Lack of personal voice or original examples
   - Formulaic patterns typical of AI writing
   - Suspiciously broad knowledge without citations
   
Provide confidence level (low/medium/high) if AI was used and explain why.`;

    // Call Lovable AI with structured output using tool calling
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'submit_grade',
              description: 'Submit the grading results with scores and feedback',
              parameters: {
                type: 'object',
                properties: {
                  criteria_scores: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        criterion_name: { type: 'string' },
                        points_earned: { type: 'number' },
                        max_points: { type: 'number' },
                        evidence: { type: 'string' },
                        feedback: { type: 'string' }
                      },
                      required: ['criterion_name', 'points_earned', 'max_points', 'evidence', 'feedback']
                    }
                  },
                  overall_strengths: { type: 'string' },
                  areas_for_improvement: { type: 'string' },
                  overall_feedback: { type: 'string' },
                  ai_detection: {
                    type: 'object',
                    properties: {
                      is_flagged: { type: 'boolean' },
                      confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
                      indicators: { 
                        type: 'array',
                        items: { type: 'string' }
                      },
                      reasoning: { type: 'string' }
                    },
                    required: ['is_flagged', 'confidence', 'indicators', 'reasoning']
                  }
                },
                required: ['criteria_scores', 'overall_strengths', 'areas_for_improvement', 'overall_feedback', 'ai_detection']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'submit_grade' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI grading failed');
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No grading result returned from AI');
    }

    const gradingResult = JSON.parse(toolCall.function.arguments);

    // Calculate total score
    const totalScore = gradingResult.criteria_scores.reduce(
      (sum: number, c: any) => sum + c.points_earned, 
      0
    );
    const percentage = (totalScore / totalMaxPoints) * 100;

    // Calculate letter grade
    const letterGrade = percentage >= 97 ? 'A+' :
                       percentage >= 93 ? 'A' :
                       percentage >= 90 ? 'A-' :
                       percentage >= 87 ? 'B+' :
                       percentage >= 83 ? 'B' :
                       percentage >= 80 ? 'B-' :
                       percentage >= 77 ? 'C+' :
                       percentage >= 73 ? 'C' :
                       percentage >= 70 ? 'C-' :
                       percentage >= 67 ? 'D+' :
                       percentage >= 63 ? 'D' :
                       percentage >= 60 ? 'D-' : 'F';

    // Save grade to database with AI detection flag
    const { error: updateError } = await supabase
      .from('assignment_submissions')
      .update({
        grade: Math.round(percentage),
        feedback: JSON.stringify({
          letterGrade,
          criteriaScores: gradingResult.criteria_scores,
          overallStrengths: gradingResult.overall_strengths,
          areasForImprovement: gradingResult.areas_for_improvement,
          overallFeedback: gradingResult.overall_feedback,
          aiDetection: gradingResult.ai_detection
        }),
        graded_at: new Date().toISOString(),
        graded_by: 'ai_system',
        status: gradingResult.ai_detection.is_flagged ? 'flagged' : 'ai_graded'
      })
      .eq('id', submissionId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        grade: {
          totalScore,
          maxPoints: totalMaxPoints,
          percentage: Math.round(percentage * 10) / 10,
          letterGrade,
          criteriaScores: gradingResult.criteria_scores,
          overallStrengths: gradingResult.overall_strengths,
          areasForImprovement: gradingResult.areas_for_improvement,
          overallFeedback: gradingResult.overall_feedback,
          aiDetection: gradingResult.ai_detection,
          gradedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grade-submission-ai:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

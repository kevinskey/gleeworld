import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * UNIVERSAL AI-ASSISTED GRADING SYSTEM
 * 
 * Design Principle:
 * AI assists evaluation.
 * Faculty performs assessment.
 * Students experience grading—not automation.
 * 
 * CRITICAL: AI output is NEVER shown to students directly.
 * All AI grades are stored as DRAFTS requiring instructor approval.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  max_points: number;
  display_order: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      submissionId, 
      assignmentId, 
      courseId,
      studentId,
      submissionContent,
      rubricId 
    } = await req.json();

    console.log('[universal-ai-grade] Starting AI grading for submission:', submissionId);

    if (!submissionId || !assignmentId || !courseId || !studentId) {
      throw new Error('Missing required fields: submissionId, assignmentId, courseId, studentId');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    // Use Lovable API if available, otherwise OpenAI
    const apiKey = lovableApiKey || openaiApiKey;
    const apiEndpoint = lovableApiKey 
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    if (!apiKey) {
      throw new Error('No AI API key configured (LOVABLE_API_KEY or OPENAI_API_KEY)');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch rubric if provided
    let criteria: RubricCriterion[] = [];
    let assignmentTitle = 'Assignment';
    let assignmentDescription = '';

    if (rubricId) {
      const { data: rubric, error: rubricError } = await supabase
        .from('gw_universal_rubrics')
        .select('*')
        .eq('id', rubricId)
        .single();

      if (!rubricError && rubric) {
        criteria = rubric.criteria as RubricCriterion[];
        console.log('[universal-ai-grade] Using rubric:', rubric.name);
      }
    }

    // Try to get assignment details
    const { data: assignment } = await supabase
      .from('gw_course_assignments')
      .select('title, description, points')
      .eq('id', assignmentId)
      .single();

    if (assignment) {
      assignmentTitle = assignment.title;
      assignmentDescription = assignment.description || '';
    }

    // Default rubric if none provided
    if (criteria.length === 0) {
      criteria = [
        { id: 'content', name: 'Content Quality', description: 'Accuracy, depth, and relevance', max_points: 40, display_order: 1 },
        { id: 'analysis', name: 'Critical Thinking', description: 'Demonstrates understanding and analysis', max_points: 35, display_order: 2 },
        { id: 'writing', name: 'Communication', description: 'Clarity and organization', max_points: 25, display_order: 3 }
      ];
    }

    const totalMaxPoints = criteria.reduce((sum, c) => sum + c.max_points, 0);

    // Build AI grading prompt - INTERNAL ONLY
    const systemPrompt = `You are an expert educator assistant providing DRAFT grading feedback for instructor review.

CRITICAL RULES:
1. Your output is INTERNAL ONLY - students will NEVER see this directly
2. Instructors will review and modify your assessments before publishing
3. Be thorough and evidence-based in your evaluation
4. Flag any concerns about academic integrity
5. Provide actionable, constructive feedback that instructors can refine

Your evaluation must be:
- Evidence-based: cite specific examples from the submission
- Balanced: acknowledge strengths and areas for improvement
- Constructive: provide actionable feedback
- Mathematically sound: scores must add up correctly
- Vigilant: detect potential AI-generated content or academic concerns`;

    const userPrompt = `Grade this student submission using the rubric below. This is an INTERNAL DRAFT for instructor review.

ASSIGNMENT: ${assignmentTitle}
${assignmentDescription ? `Description: ${assignmentDescription}` : ''}

STUDENT SUBMISSION:
${submissionContent || '[No inline content - check file attachments]'}

RUBRIC CRITERIA (Total: ${totalMaxPoints} points):
${criteria.map((c, i) => `${i + 1}. ${c.name} (${c.max_points} points max)
   ${c.description}`).join('\n')}

TASKS:
1. Grade each criterion with evidence and specific feedback
2. Identify overall strengths and areas for improvement
3. Analyze for potential AI-generated content:
   - Generic, overly polished language
   - Unusually perfect grammar for student level
   - Lack of personal voice or original examples
   - Formulaic AI writing patterns
   - Suspiciously broad knowledge without citations
4. Provide confidence level (low/medium/high) if AI was likely used`;

    console.log('[universal-ai-grade] Calling AI API...');

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: lovableApiKey ? 'google/gemini-2.5-flash' : 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'submit_draft_grade',
              description: 'Submit the draft grading results for instructor review',
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
                        evidence: { type: 'string', description: 'Specific examples from submission' },
                        feedback: { type: 'string', description: 'Constructive feedback for this criterion' }
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
        tool_choice: { type: 'function', function: { name: 'submit_draft_grade' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('[universal-ai-grade] Rate limit exceeded');
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('[universal-ai-grade] AI API error:', response.status, errorText);
      throw new Error(`AI grading failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No grading result returned from AI');
    }

    const gradingResult = JSON.parse(toolCall.function.arguments);
    console.log('[universal-ai-grade] AI grading completed');

    // Calculate scores
    const totalScore = gradingResult.criteria_scores.reduce(
      (sum: number, c: { points_earned: number }) => sum + c.points_earned, 
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

    // Store as DRAFT in gw_ai_draft_grades - REQUIRES instructor approval
    const { data: draftGrade, error: draftError } = await supabase
      .from('gw_ai_draft_grades')
      .upsert({
        submission_id: submissionId,
        assignment_id: assignmentId,
        course_id: courseId,
        student_id: studentId,
        ai_total_score: totalScore,
        ai_max_score: totalMaxPoints,
        ai_percentage: Math.round(percentage * 10) / 10,
        ai_letter_grade: letterGrade,
        ai_criteria_scores: gradingResult.criteria_scores,
        ai_overall_feedback: gradingResult.overall_feedback,
        ai_strengths: gradingResult.overall_strengths,
        ai_improvements: gradingResult.areas_for_improvement,
        ai_detection_flagged: gradingResult.ai_detection.is_flagged,
        ai_detection_confidence: gradingResult.ai_detection.confidence,
        ai_detection_indicators: gradingResult.ai_detection.indicators,
        ai_detection_reasoning: gradingResult.ai_detection.reasoning,
        status: 'pending_review',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'submission_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (draftError) {
      console.error('[universal-ai-grade] Error saving draft:', draftError);
      throw draftError;
    }

    console.log('[universal-ai-grade] Draft grade saved:', draftGrade.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'AI draft grade created - pending instructor review',
        draftId: draftGrade.id,
        draft: {
          totalScore,
          maxPoints: totalMaxPoints,
          percentage: Math.round(percentage * 10) / 10,
          letterGrade,
          criteriaScores: gradingResult.criteria_scores,
          overallStrengths: gradingResult.overall_strengths,
          areasForImprovement: gradingResult.areas_for_improvement,
          overallFeedback: gradingResult.overall_feedback,
          aiDetection: gradingResult.ai_detection,
          status: 'pending_review'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[universal-ai-grade] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

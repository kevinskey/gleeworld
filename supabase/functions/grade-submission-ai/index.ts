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

    console.log('[grade-submission-ai] Starting grading for submission:', submissionId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try gw_assignment_submissions first, then gw_course_submissions
    let submission: any = null;
    let submissionTable = 'gw_assignment_submissions';

    const { data: asSub } = await supabase
      .from('gw_assignment_submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle();

    if (asSub) {
      submission = asSub;
    } else {
      const { data: csSub, error: csErr } = await supabase
        .from('gw_course_submissions')
        .select('*')
        .eq('id', submissionId)
        .maybeSingle();

      if (csErr) {
        console.error('[grade-submission-ai] Error fetching from gw_course_submissions:', csErr);
        throw csErr;
      }
      if (!csSub) {
        throw new Error(`Submission ${submissionId} not found in any table`);
      }
      submission = {
        ...csSub,
        user_id: csSub.student_id,
        notes: csSub.content,
      };
      submissionTable = 'gw_course_submissions';
    }

    // Fetch assignment details separately
    let assignmentData: any = null;
    if (submission.assignment_id) {
      const { data: aData } = await supabase
        .from('gw_course_assignments')
        .select('id, title, description, points, assignment_type, rubric_id')
        .eq('id', submission.assignment_id)
        .maybeSingle();
      assignmentData = aData;
    }

    // Attach for downstream compatibility
    submission.gw_course_assignments = assignmentData;

    console.log('[grade-submission-ai] Submission found:', {
      id: submission.id,
      assignmentId: submission.assignment_id,
      assignmentTitle: submission.gw_course_assignments?.title,
      rubricId: submission.gw_course_assignments?.rubric_id
    });

    // Fetch the linked rubric from gw_universal_rubrics if available
    let rubricFromDb = null;
    if (submission.gw_course_assignments?.rubric_id) {
      const { data: rubric, error: rubricError } = await supabase
        .from('gw_universal_rubrics')
        .select('*')
        .eq('id', submission.gw_course_assignments.rubric_id)
        .single();
      
      if (rubricError) {
        console.warn('[grade-submission-ai] Error fetching rubric:', rubricError);
      } else {
        rubricFromDb = rubric;
        console.log('[grade-submission-ai] Rubric loaded:', rubric.name, 'with', rubric.criteria?.length, 'criteria');
      }
    }

    // Transform rubric criteria to the format expected by the AI
    // Priority: 1) Passed rubricCriteria, 2) Linked rubric from DB, 3) Fallback
    let criteria;
    
    if (rubricCriteria && rubricCriteria.length > 0) {
      // Use explicitly passed rubric criteria
      criteria = rubricCriteria;
      console.log('[grade-submission-ai] Using passed rubric criteria');
    } else if (rubricFromDb?.criteria && Array.isArray(rubricFromDb.criteria)) {
      // Transform DB rubric format to AI format
      criteria = rubricFromDb.criteria.map((c: any) => ({
        name: c.name,
        description: c.description,
        maxPoints: c.max_points || c.maxPoints
      }));
      console.log('[grade-submission-ai] Using linked rubric from database:', rubricFromDb.name);
    } else {
      // Fallback criteria based on assignment type
      const assignmentType = submission.gw_course_assignments?.assignment_type;
      criteria = getFallbackCriteria(assignmentType);
      console.log('[grade-submission-ai] Using fallback criteria for type:', assignmentType);
    }

    const totalMaxPoints = criteria.reduce((sum: number, c: any) => sum + c.maxPoints, 0);
    
    // Get content from submission
    const contentText = submission.content || 
                       submission.notes || 
                       (submission.file_url ? `File URL: ${submission.file_url}` : 'No content available');

    console.log('[grade-submission-ai] Content length:', contentText.length);

    // Build AI grading prompt with detection
    const systemPrompt = `You are an expert educator providing fair, transparent, and defensible grading. 
Your evaluation must be:
- Evidence-based: cite specific examples from the submission
- Balanced: acknowledge strengths and areas for improvement
- Constructive: provide actionable feedback
- Mathematically sound: scores must add up correctly
- Vigilant: detect AI-generated content and academic dishonesty

IMPORTANT: Score each criterion on a scale from 0 to the max_points. Be precise and fair.`;

    const userPrompt = `Grade this student submission using the rubric below AND analyze if it was AI-generated.

ASSIGNMENT: ${submission.gw_course_assignments?.title || 'Assignment'}
${submission.gw_course_assignments?.description ? `Description: ${submission.gw_course_assignments.description}` : ''}
Maximum Points: ${submission.gw_course_assignments?.points || totalMaxPoints}

STUDENT SUBMISSION:
${contentText}

RUBRIC CRITERIA:
${criteria.map((c: any, i: number) => `${i + 1}. ${c.name} (${c.maxPoints} points max)
   ${c.description}`).join('\n')}

TOTAL POSSIBLE POINTS: ${totalMaxPoints}

TASKS:
1. Grade each criterion with evidence and feedback. Assign points between 0 and the max for that criterion.
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
      console.error('[grade-submission-ai] AI API error:', response.status, errorText);
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

    console.log('[grade-submission-ai] Grading complete:', {
      totalScore,
      totalMaxPoints,
      percentage: Math.round(percentage * 10) / 10,
      letterGrade,
      criteriaCount: gradingResult.criteria_scores.length,
      aiDetected: gradingResult.ai_detection.is_flagged
    });

    // Save grade to the correct table
    const gradePayload = JSON.stringify({
      totalScore,
      maxPoints: totalMaxPoints,
      percentage: Math.round(percentage * 10) / 10,
      letterGrade,
      criteriaScores: gradingResult.criteria_scores,
      overallStrengths: gradingResult.overall_strengths,
      areasForImprovement: gradingResult.areas_for_improvement,
      overallFeedback: gradingResult.overall_feedback,
      aiDetection: gradingResult.ai_detection,
      rubricName: rubricFromDb?.name || 'Default Rubric',
      rubricId: submission.gw_course_assignments?.rubric_id || null,
      gradedAt: new Date().toISOString()
    });

    let updateError: any = null;
    if (submissionTable === 'gw_course_submissions') {
      const { error } = await supabase
        .from('gw_course_submissions')
        .update({
          ai_feedback: gradePayload,
          ai_score: totalScore,
          points_earned: totalScore,
          grade: Math.round(percentage * 10) / 10,
          graded_at: new Date().toISOString(),
          status: gradingResult.ai_detection.is_flagged ? 'flagged' : 'ai_graded'
        })
        .eq('id', submissionId);
      updateError = error;
    } else {
      const { error } = await supabase
        .from('gw_assignment_submissions')
        .update({
          score_value: totalScore,
          ai_feedback: gradePayload,
          graded_at: new Date().toISOString(),
          status: gradingResult.ai_detection.is_flagged ? 'flagged' : 'ai_graded'
        })
        .eq('id', submissionId);
      updateError = error;
    }

    if (updateError) {
      console.error('[grade-submission-ai] Error updating submission:', updateError);
      throw updateError;
    }

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
          rubricName: rubricFromDb?.name || 'Default Rubric',
          rubricId: submission.gw_course_assignments?.rubric_id || null,
          gradedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[grade-submission-ai] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Fallback criteria based on assignment type
function getFallbackCriteria(assignmentType: string | null) {
  switch (assignmentType) {
    case 'writing':
      return [
        { name: "Thesis & Central Argument", description: "Clear thesis with well-developed argument", maxPoints: 25 },
        { name: "Evidence & Support", description: "Strong use of evidence and sources", maxPoints: 25 },
        { name: "Organization & Structure", description: "Logical flow with clear intro and conclusion", maxPoints: 20 },
        { name: "Critical Analysis", description: "Deep thinking and insightful interpretation", maxPoints: 15 },
        { name: "Grammar & Mechanics", description: "Proper grammar, spelling, and punctuation", maxPoints: 15 }
      ];
    case 'listening_journal':
    case 'journal':
      return [
        { name: "Musical Elements Identification", description: "Accurate identification of musical elements", maxPoints: 30 },
        { name: "Cultural & Historical Context", description: "Understanding of cultural significance", maxPoints: 25 },
        { name: "Personal Response & Reflection", description: "Thoughtful personal engagement", maxPoints: 20 },
        { name: "Connections & Comparisons", description: "Meaningful connections to course material", maxPoints: 15 },
        { name: "Writing Quality", description: "Clear, coherent writing", maxPoints: 10 }
      ];
    case 'reflection_paper':
      return [
        { name: "Depth of Reflection", description: "Deep, genuine reflection with insights", maxPoints: 30 },
        { name: "Connection to Course Content", description: "Connects to course concepts", maxPoints: 25 },
        { name: "Self-Awareness & Growth", description: "Honest self-assessment", maxPoints: 20 },
        { name: "Specificity & Examples", description: "Uses specific examples", maxPoints: 15 },
        { name: "Presentation & Clarity", description: "Well-organized and clear", maxPoints: 10 }
      ];
    case 'video':
    case 'presentation':
      return [
        { name: "Content Quality", description: "Accurate and substantive content", maxPoints: 30 },
        { name: "Presentation Skills", description: "Clear delivery and professional demeanor", maxPoints: 25 },
        { name: "Preparation & Organization", description: "Thorough preparation", maxPoints: 20 },
        { name: "Technical Quality", description: "Good audio/video quality", maxPoints: 15 },
        { name: "Creativity & Engagement", description: "Creative and engaging approach", maxPoints: 10 }
      ];
    case 'essay':
      return [
        { name: "Thesis Statement", description: "Clear, arguable thesis", maxPoints: 20 },
        { name: "Argument Development", description: "Well-developed arguments", maxPoints: 25 },
        { name: "Use of Sources", description: "Effective source integration", maxPoints: 20 },
        { name: "Essay Structure", description: "Clear intro, body, conclusion", maxPoints: 20 },
        { name: "Style & Conventions", description: "Academic tone and proper grammar", maxPoints: 15 }
      ];
    case 'exercise':
    case 'quiz':
      return [
        { name: "Accuracy & Correctness", description: "Correct answers and completion", maxPoints: 40 },
        { name: "Completeness", description: "All parts completed as instructed", maxPoints: 30 },
        { name: "Effort & Engagement", description: "Evidence of genuine effort", maxPoints: 20 },
        { name: "Timeliness", description: "Submitted on time", maxPoints: 10 }
      ];
    default:
      return [
        { name: "Content Quality", description: "Accuracy, depth, and relevance of content", maxPoints: 40 },
        { name: "Analysis & Critical Thinking", description: "Demonstrates understanding and insightful analysis", maxPoints: 35 },
        { name: "Communication", description: "Clarity, organization, and proper writing mechanics", maxPoints: 25 }
      ];
  }
}

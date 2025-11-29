import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { journalId } = await req.json();
    
    if (!journalId) {
      throw new Error('Journal ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch journal entry
    const { data: journal, error: journalError } = await supabase
      .from('mus240_journal_entries')
      .select('*')
      .eq('id', journalId)
      .single();

    if (journalError) throw journalError;

    // Fetch assignment details from gw_assignments using legacy_id
    const { data: assignment, error: assignmentError } = await supabase
      .from('gw_assignments')
      .select('id, title, description, points')
      .eq('legacy_source', 'mus240_assignments')
      .eq('legacy_id', journal.assignment_id)
      .maybeSingle();

    if (assignmentError) {
      console.error('Error fetching assignment:', assignmentError);
    }

    const assignmentPoints = assignment?.points || 100;
    const assignmentTitle = assignment?.title || `Assignment ${journal.assignment_id}`;
    const assignmentDescription = assignment?.description || '';

    console.log('Generating rubric for:', assignmentTitle, 'Points:', assignmentPoints);

    // Generate rubric dynamically using AI
    const rubricPrompt = `Generate a grading rubric for this MUS240 Listening Journal assignment.

ASSIGNMENT: ${assignmentTitle}
DESCRIPTION: ${assignmentDescription}
TOTAL POINTS: ${assignmentPoints}

Create 4-6 criteria that:
1. Always include these base criteria (adjust points proportionally):
   - Grammar & Writing Quality (10-15% of points)
   - Word Count & Completeness (10-15% of points)  
   - Academic Integrity (5-10% of points)

2. Add 2-4 content-specific criteria based on the assignment instructions that evaluate:
   - Musical analysis skills
   - Understanding of specific concepts mentioned in instructions
   - Application of course concepts
   - Quality of reflection and critical thinking

Distribute the ${assignmentPoints} points across all criteria. Return as JSON.`;

    const rubricResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at creating fair, detailed grading rubrics for music courses.' 
          },
          { role: 'user', content: rubricPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'create_rubric',
            description: 'Create a grading rubric',
            parameters: {
              type: 'object',
              properties: {
                criteria: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      maxPoints: { type: 'number' }
                    },
                    required: ['name', 'description', 'maxPoints']
                  }
                }
              },
              required: ['criteria']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'create_rubric' } }
      })
    });

    if (!rubricResponse.ok) {
      throw new Error(`Rubric generation failed: ${rubricResponse.status}`);
    }

    const rubricData = await rubricResponse.json();
    const rubricArgs = JSON.parse(
      rubricData.choices[0].message.tool_calls[0].function.arguments
    );
    const criteria = rubricArgs.criteria;

    // Ensure total points match assignment points
    const totalMaxPoints = criteria.reduce((sum: number, c: any) => sum + c.maxPoints, 0);
    if (totalMaxPoints !== assignmentPoints) {
      const ratio = assignmentPoints / totalMaxPoints;
      criteria.forEach((c: any) => {
        c.maxPoints = Math.round(c.maxPoints * ratio);
      });
    }

    console.log('Generated rubric:', JSON.stringify(criteria, null, 2));


    const systemPrompt = `You are an expert music educator grading MUS240 (African American Music) listening journals for undergraduate non-music majors.
Your evaluation must be:
- Evidence-based: cite specific examples from the student's writing
- Balanced: acknowledge strengths and areas for improvement
- Constructive: provide actionable feedback for improvement
- Supportive: Encourage learning while maintaining reasonable standards for non-music majors
- Educational: Focus on growth and understanding rather than just catching mistakes`;

    const userPrompt = `Grade this MUS240 listening journal entry using the rubric below AND analyze if it was AI-generated.

ASSIGNMENT: ${assignmentTitle}
DESCRIPTION: ${assignmentDescription}

STUDENT SUBMISSION:
${journal.content || 'No content provided'}

Word Count: ${journal.word_count || 0}

RUBRIC CRITERIA:
${criteria.map((c: any, i: number) => `${i + 1}. ${c.name} (${c.maxPoints} points max)
   ${c.description}`).join('\n')}

GRADING STANDARDS (Balanced for non-music majors):
- Value honest effort and genuine engagement with the music
- Look for personal voice and authentic reactions, even if not technically sophisticated
- Credit students who try to apply course concepts, even if imperfectly
- Appreciate specific examples and details from the recordings
- Allow for varied writing styles while expecting coherent communication
- Focus on understanding and growth over perfect execution

AI DETECTION (Balanced approach):
Only flag as AI-generated if multiple red flags appear:
- Completely generic language with zero personal voice or emotion
- Suspiciously perfect structure inconsistent with student's other work
- Zero specific details from the actual recordings being discussed
- Use of advanced musical terminology far beyond course level without explanation

Give students the benefit of the doubt - many write formally but authentically. Flag only obvious AI usage with medium/high confidence.`;

    // Call Lovable AI with structured output

    // Call Lovable AI with structured output
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
              description: 'Submit the final grade and feedback for the journal entry',
              parameters: {
                type: 'object',
                properties: {
                  criteria_scores: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        criterion_name: { 
                          type: 'string',
                          description: 'Name of the rubric criterion'
                        },
                        score: { 
                          type: 'number',
                          description: 'Points earned for this criterion'
                        },
                        max_points: {
                          type: 'number',
                          description: 'Maximum points possible for this criterion'
                        },
                        feedback: { 
                          type: 'string',
                          description: 'Specific feedback for this criterion explaining the score'
                        }
                      },
                      required: ['criterion_name', 'score', 'max_points', 'feedback']
                    },
                    description: 'Array of scores for each rubric criterion. Must include: Musical Elements Identification (30 max), Cultural & Historical Understanding (30 max), Blues Connection (25 max), Personal Reflection (15 max)'
                  },
                  overall_strengths: { type: 'string' },
                  areas_for_improvement: { type: 'string' },
                  overall_feedback: { type: 'string' },
                  ai_detection: {
                    type: 'object',
                    properties: {
                      is_flagged: { type: 'boolean' },
                      confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
                      reasoning: { type: 'string' }
                    },
                    required: ['is_flagged', 'confidence', 'reasoning']
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
      const errorText = await response.text();
      console.error('Lovable AI error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        journalId: journalId
      });
      
      // If 503 Service Unavailable, provide a more helpful error message
      if (response.status === 503) {
        throw new Error('AI service temporarily unavailable. Please try again in a few moments.');
      }
      
      throw new Error(`AI grading failed: ${response.statusText}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No grading result returned from AI');
    }

    const gradingResult = JSON.parse(toolCall.function.arguments);

    // Validate criteria scores
    if (!gradingResult.criteria_scores || gradingResult.criteria_scores.length === 0) {
      throw new Error('No criteria scores returned');
    }

    // Normalize per-criterion max points against our rubric and clamp scores
    const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const criteriaMap = new Map(criteria.map((c: any) => [normalize(c.name), c.maxPoints]));

    gradingResult.criteria_scores = gradingResult.criteria_scores.map((c: any) => {
      const name = c.criterion_name || c.criterion || '';
      const key = normalize(name);
      let max = criteriaMap.get(key);

      if (max === undefined) {
        const found = criteria.find((cr: any) => {
          const n = normalize(cr.name);
          return key && (n.includes(key) || key.includes(n));
        });
        max = found?.maxPoints;
      }

      const safeMax = typeof max === 'number' ? max : 0;
      const rawScore = Number(c.score) || 0;
      const safeScore = Math.min(Math.max(rawScore, 0), safeMax);

      return {
        ...c,
        criterion_name: name || 'Unmatched Criterion',
        max_points: safeMax,
        score: safeScore,
      };
    });

    // Calculate total score using normalized scores
    const totalScore = gradingResult.criteria_scores.reduce(
      (sum: number, c: any) => sum + (c.score || 0), 
      0
    );
    const percentage = totalMaxPoints > 0 ? (totalScore / totalMaxPoints) * 100 : 0;
    
    // Determine letter grade
    let letterGrade = 'F';
    if (percentage >= 93) letterGrade = 'A';
    else if (percentage >= 90) letterGrade = 'A-';
    else if (percentage >= 87) letterGrade = 'B+';
    else if (percentage >= 83) letterGrade = 'B';
    else if (percentage >= 80) letterGrade = 'B-';
    else if (percentage >= 77) letterGrade = 'C+';
    else if (percentage >= 73) letterGrade = 'C';
    else if (percentage >= 70) letterGrade = 'C-';
    else if (percentage >= 67) letterGrade = 'D+';
    else if (percentage >= 63) letterGrade = 'D';
    else if (percentage >= 60) letterGrade = 'D-';

    // Update journal entry with grade and feedback
    const { error: updateError } = await supabase
      .from('mus240_journal_entries')
      .update({
        grade: Math.round(percentage),
        feedback: JSON.stringify({
          letterGrade,
          criteriaScores: gradingResult.criteria_scores,
          overallStrengths: gradingResult.overall_strengths,
          areasForImprovement: gradingResult.areas_for_improvement,
          overallFeedback: gradingResult.overall_feedback,
          aiDetection: gradingResult.ai_detection,
          totalScore,
          maxPoints: totalMaxPoints
        }),
        graded_at: new Date().toISOString(),
        graded_by: null // AI grading - no specific user
      })
      .eq('id', journalId);


    // Sync with new gradebook tables
    if (assignment?.id && journal?.student_id) {
      const assignmentId = assignment.id as string;
      const studentId = journal.student_id as string;

      // Upsert gw_grades (percentage is auto-calculated, don't include it)
      const gradePayload = {
        assignment_id: assignmentId,
        student_id: studentId,
        total_score: Math.round(totalScore),
        max_points: totalMaxPoints,
        letter_grade: letterGrade,
        graded_at: new Date().toISOString(),
        graded_by: null, // AI grading - no specific user
        legacy_source: 'mus240_assignments',
        legacy_id: journal.assignment_id,
      } as any;

      const upsertGrades = await supabase
        .from('gw_grades')
        .upsert(gradePayload, { onConflict: 'student_id,assignment_id' })
        .select()
        .maybeSingle();

      if (upsertGrades.error) {
        console.error('gw_grades upsert error:', upsertGrades.error);
      }

      // Ensure gw_submissions reflects graded status
      const existingSub = await supabase
        .from('gw_submissions')
        .select('id, submitted_at')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingSub.error && existingSub.error.code !== 'PGRST116') {
        console.warn('gw_submissions select error:', existingSub.error);
      }

      if (existingSub.data) {
        const upd = await supabase
          .from('gw_submissions')
          .update({ status: 'graded', submitted_at: existingSub.data.submitted_at || journal.published_at || new Date().toISOString(), legacy_source: 'mus240_assignments', legacy_id: journal.assignment_id })
          .eq('id', existingSub.data.id);
        if (upd.error) console.warn('gw_submissions update error:', upd.error);
      } else {
        const ins = await supabase
          .from('gw_submissions')
          .insert({ assignment_id: assignmentId, student_id: studentId, status: 'graded', submitted_at: journal.published_at || new Date().toISOString(), legacy_source: 'mus240_assignments', legacy_id: journal.assignment_id });
        if (ins.error) console.warn('gw_submissions insert error:', ins.error);
      }

      // Save rubric scores to gw_grades_rubric_scores
      if (upsertGrades.data?.id) {
        const gradeId = upsertGrades.data.id;
        
        // Delete existing rubric scores for this grade
        await supabase
          .from('gw_grades_rubric_scores')
          .delete()
          .eq('grade_id', gradeId);

        // Insert new rubric scores
        const rubricScores = gradingResult.criteria_scores.map((criteriaScore: any) => ({
          grade_id: gradeId,
          criterion_name: criteriaScore.criterion_name,
          points_earned: criteriaScore.score,
          points_possible: criteriaScore.max_points,
          feedback: criteriaScore.feedback
        }));

        const { error: rubricError, data: rubricData } = await supabase
          .from('gw_grades_rubric_scores')
          .insert(rubricScores);

        if (rubricError) {
          console.error('Error saving rubric scores:', {
            error: rubricError,
            message: rubricError.message,
            details: rubricError.details,
            hint: rubricError.hint,
            code: rubricError.code,
            rubricScores: JSON.stringify(rubricScores)
          });
        } else {
          console.log('Rubric scores saved successfully:', rubricData?.length || 0, 'records');
        }
      }
    }

    // Store grade in mus240_journal_grades table
    // overall_score should be the actual points earned (0-10 for lj1, based on rubric)
    const totalEarned = gradingResult.criteria_scores.reduce((sum, c) => sum + c.score, 0);
    const totalPossible = gradingResult.criteria_scores.reduce((sum, c) => sum + c.max_points, 0);
    
    const gradeData = {
      student_id: journal.student_id,
      assignment_id: journal.assignment_id,
      journal_id: journalId,
      overall_score: totalEarned, // Store actual points earned from rubric
      letter_grade: letterGrade,
      ai_feedback: gradingResult.overall_feedback,
      graded_at: new Date().toISOString(),
      ai_model: 'gemini-2.5-flash',
      rubric: {
        criteria: criteria,
        scores: gradingResult.criteria_scores
      }
    };

    const { error: gradeError } = await supabase
      .from('mus240_journal_grades')
      .upsert(gradeData, { onConflict: 'student_id,assignment_id' });

    if (gradeError) {
      console.error('Error saving to mus240_journal_grades:', gradeError);
    }


    // Success response
    return new Response(
      JSON.stringify({ 
        success: true,
        journalId,
        assignmentId: assignment?.id ?? null,
        totalScore: Math.round(totalScore),
        percentage: Math.round(percentage),
        letterGrade,
        maxPoints: totalMaxPoints
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('MUS240 journal grading error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

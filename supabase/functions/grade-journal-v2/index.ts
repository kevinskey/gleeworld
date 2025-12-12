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
    const { journalId, content, prompt, maxPoints, assignmentId } = await req.json();

    if (!journalId || !content || !prompt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase client (used for both reading assignment and writing grade)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine effective max points from DB when possible
    let effectiveMaxPoints = maxPoints ?? 100;

    if (assignmentId) {
      console.log('Looking up assignment with ID:', assignmentId);
      const { data: assignment, error: assignmentError } = await supabase
        .from('gw_assignments')
        .select('points')
        .eq('id', assignmentId)
        .maybeSingle();

      console.log('Assignment lookup result:', { assignment, error: assignmentError });

      if (assignmentError) {
        console.error('Error fetching assignment:', assignmentError);
        throw new Error(`Failed to fetch assignment: ${assignmentError.message}`);
      }

      if (!assignment) {
        console.error('Assignment not found with ID:', assignmentId);
        throw new Error(`Assignment not found: ${assignmentId}`);
      }

      if (assignment?.points) {
        effectiveMaxPoints = assignment.points;
        console.log('Using assignment points from DB:', effectiveMaxPoints);
      }
    } else {
      console.warn('No assignmentId provided, using default maxPoints:', effectiveMaxPoints);
    }

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create rubric criteria based on max points - ensure they add up to exactly effectiveMaxPoints
    const weights = [0.35, 0.30, 0.25, 0.10];
    const criteriaNames = ['Content Quality', 'Critical Analysis', 'Musical Understanding', 'Writing Quality'];
    
    // Calculate base scores and distribute remainder
    const baseScores = weights.map(w => Math.floor(effectiveMaxPoints * w));
    const total = baseScores.reduce((sum, score) => sum + score, 0);
    const remainder = effectiveMaxPoints - total;
    
    // Distribute remainder to first criteria
    baseScores[0] += remainder;
    
    const rubricCriteria = criteriaNames.map((name, i) => ({
      name,
      maxScore: baseScores[i]
    }));

    // Call OpenAI to grade the journal AND detect AI writing
    const aiPrompt = `You are an expert music professor grading a listening journal entry. Grade the following submission based on the assignment prompt and rubric criteria.

**IMPORTANT**: You must also analyze whether this submission was likely written by AI (like ChatGPT, Claude, etc.) based on:
- Overly formal or academic language inappropriate for a student journal
- Lack of personal voice or authentic student perspective
- Perfect grammar and structure that seems too polished
- Generic or templated responses without genuine personal reflection
- Repetitive sentence structures typical of AI writing
- Absence of casual language, contractions, or natural student expression

Assignment Prompt:
${prompt}

Student Submission:
${content}

Rubric Criteria (total ${effectiveMaxPoints} points):
${rubricCriteria.map(c => `- ${c.name}: ${c.maxScore} points`).join('\n')}

Please provide:
1. A score for each rubric criterion
2. Specific feedback for each criterion
3. An overall letter grade
4. Overall constructive feedback
5. AI writing detection analysis

Respond in JSON format:
{
  "rubric": [
    {
      "criterion": "Content Quality",
      "score": <number>,
      "maxScore": ${rubricCriteria[0].maxScore},
      "feedback": "<specific feedback>"
    },
    ...
  ],
  "overall_score": <total points>,
  "letter_grade": "<A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F>",
  "ai_feedback": "<overall constructive feedback>",
  "ai_detection": {
    "likely_ai_generated": <boolean>,
    "confidence": <number 0-100>,
    "reasoning": "<brief explanation of why you think this is or isn't AI-generated>"
  }
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert music professor. Provide detailed, constructive feedback on student work and detect AI-generated writing.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error('Failed to get AI grading');
    }

    const aiResult = await response.json();
    const gradingData = JSON.parse(aiResult.choices[0].message.content);

    console.log('AI grading result:', {
      overall_score: gradingData.overall_score,
      letter_grade: gradingData.letter_grade,
      effectiveMaxPoints,
      rubricScores: gradingData.rubric?.map((r: any) => r.score),
      ai_detected: gradingData.ai_detection?.likely_ai_generated
    });

    // Normalize score to an integer within valid range using effectiveMaxPoints from DB
    let normalizedScore = Number(gradingData.overall_score);
    if (isNaN(normalizedScore)) {
      console.error('AI returned non-numeric score, defaulting to 0:', gradingData.overall_score);
      normalizedScore = 0;
    }

    // Round to nearest integer first
    normalizedScore = Math.round(normalizedScore);

    // Clamp to [0, effectiveMaxPoints]
    if (normalizedScore < 0 || normalizedScore > effectiveMaxPoints) {
      console.error('AI returned out-of-range score:', normalizedScore, 'Max:', effectiveMaxPoints);
      normalizedScore = Math.max(0, Math.min(effectiveMaxPoints, normalizedScore));
    }

    gradingData.overall_score = normalizedScore;
    console.log('Final normalized score used for insert:', gradingData.overall_score);

    // Store the grade in the database (Supabase client already created above)

    // Get student_id from journal
    const { data: journal } = await supabase
      .from('mus240_journal_entries')
      .select('student_id')
      .eq('id', journalId)
      .single();

    if (!journal) {
      throw new Error('Journal not found');
    }

    console.log('Inserting grade:', {
      journal_id: journalId,
      student_id: journal.student_id,
      assignment_id: assignmentId,
      overall_score: gradingData.overall_score,
      effectiveMaxPoints,
      ai_detected: gradingData.ai_detection?.likely_ai_generated
    });

    // Upsert the grade (handles both new and re-grading cases)
    let { error: insertError } = await supabase
      .from('mus240_journal_grades')
      .upsert({
        journal_id: journalId,
        student_id: journal.student_id,
        assignment_id: assignmentId,
        overall_score: gradingData.overall_score,
        letter_grade: gradingData.letter_grade,
        rubric: gradingData.rubric,
        ai_feedback: gradingData.ai_feedback,
        ai_model: 'gpt-4o-mini',
        graded_at: new Date().toISOString(),
        ai_writing_detected: gradingData.ai_detection?.likely_ai_generated || false,
        ai_detection_confidence: gradingData.ai_detection?.confidence || null,
        ai_detection_notes: gradingData.ai_detection?.reasoning || null
      }, {
        onConflict: 'assignment_id,student_id'
      });

    // If we hit a duplicate key on journal_id, it means there are
    // already multiple rows for this journal. Clean them up and
    // replace with a single fresh grade.
    if (insertError && insertError.code === '23505') {
      console.error('Duplicate grade detected for journal; cleaning up and replacing existing grades.', insertError);

      // Remove all existing grades for this journal_id
      const { error: deleteError } = await supabase
        .from('mus240_journal_grades')
        .delete()
        .eq('journal_id', journalId);

      if (deleteError) {
        console.error('Error deleting duplicate journal grades:', deleteError);
      } else {
        // Insert a single fresh row
        const retryResult = await supabase
          .from('mus240_journal_grades')
          .insert({
            journal_id: journalId,
            student_id: journal.student_id,
            assignment_id: assignmentId,
            overall_score: gradingData.overall_score,
            letter_grade: gradingData.letter_grade,
            rubric: gradingData.rubric,
            ai_feedback: gradingData.ai_feedback,
            ai_model: 'gpt-4o-mini',
            graded_at: new Date().toISOString(),
            ai_writing_detected: gradingData.ai_detection?.likely_ai_generated || false,
            ai_detection_confidence: gradingData.ai_detection?.confidence || null,
            ai_detection_notes: gradingData.ai_detection?.reasoning || null
          });

        insertError = retryResult.error;
      }
    }

    // If the database complains about an invalid grade range, adapt to its expected max
    if (insertError && insertError.code === 'P0001' &&
        typeof insertError.message === 'string' &&
        insertError.message.includes('Overall score must be between 0 and')) {
      console.error('Grade out of allowed range, adjusting based on DB constraint:', insertError.message);

      const match = insertError.message.match(/between 0 and (\d+) points/);
      const dbMax = match ? Number(match[1]) : effectiveMaxPoints;

      const adjustedScore = Math.max(0, Math.min(dbMax, gradingData.overall_score));
      console.log('Adjusted score based on DB max:', { dbMax, adjustedScore });

      gradingData.overall_score = adjustedScore;

      // Retry upsert once with the adjusted score
      const retryResult = await supabase
        .from('mus240_journal_grades')
        .upsert({
          journal_id: journalId,
          student_id: journal.student_id,
          assignment_id: assignmentId,
          overall_score: gradingData.overall_score,
          letter_grade: gradingData.letter_grade,
          rubric: gradingData.rubric,
          ai_feedback: gradingData.ai_feedback,
          ai_model: 'gpt-4o-mini',
          graded_at: new Date().toISOString(),
          ai_writing_detected: gradingData.ai_detection?.likely_ai_generated || false,
          ai_detection_confidence: gradingData.ai_detection?.confidence || null,
          ai_detection_notes: gradingData.ai_detection?.reasoning || null
        }, {
          onConflict: 'assignment_id,student_id'
        });

      insertError = retryResult.error;
    }

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        grade: gradingData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grade-journal-v2:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred while grading'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

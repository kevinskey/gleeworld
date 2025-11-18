import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create rubric criteria based on max points - ensure they add up to exactly maxPoints
    const weights = [0.35, 0.30, 0.25, 0.10];
    const criteriaNames = ['Content Quality', 'Critical Analysis', 'Musical Understanding', 'Writing Quality'];
    
    // Calculate base scores and distribute remainder
    const baseScores = weights.map(w => Math.floor(maxPoints * w));
    const total = baseScores.reduce((sum, score) => sum + score, 0);
    const remainder = maxPoints - total;
    
    // Distribute remainder to first criteria
    baseScores[0] += remainder;
    
    const rubricCriteria = criteriaNames.map((name, i) => ({
      name,
      maxScore: baseScores[i]
    }));

    // Call OpenAI to grade the journal
    const aiPrompt = `You are an expert music professor grading a listening journal entry. Grade the following submission based on the assignment prompt and rubric criteria.

Assignment Prompt:
${prompt}

Student Submission:
${content}

Rubric Criteria (total ${maxPoints} points):
${rubricCriteria.map(c => `- ${c.name}: ${c.maxScore} points`).join('\n')}

Please provide:
1. A score for each rubric criterion
2. Specific feedback for each criterion
3. An overall letter grade
4. Overall constructive feedback

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
  "ai_feedback": "<overall constructive feedback>"
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
            content: 'You are an expert music professor. Provide detailed, constructive feedback on student work.'
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

    // Validate the grade is within acceptable range
    if (gradingData.overall_score < 0 || gradingData.overall_score > maxPoints) {
      console.error('AI returned invalid score:', gradingData.overall_score, 'Max:', maxPoints);
      // Clamp the score to valid range
      gradingData.overall_score = Math.max(0, Math.min(maxPoints, gradingData.overall_score));
    }

    // Store the grade in the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get student_id from journal
    const { data: journal } = await supabase
      .from('mus240_journal_entries')
      .select('student_id')
      .eq('id', journalId)
      .single();

    if (!journal) {
      throw new Error('Journal not found');
    }

    const { error: insertError } = await supabase
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
        graded_at: new Date().toISOString()
      });

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
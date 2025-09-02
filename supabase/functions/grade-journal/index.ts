
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GradingRequest {
  assignment_id: string;
  journal_content: string;
  student_id: string;
  journal_id?: string;
  rubric?: {
    criteria: Array<{
      name: string;
      description: string;
      max_points: number;
    }>;
  };
}

interface RubricScore {
  criterion: string;
  score: number;
  max_score: number;
  feedback: string;
}

interface GradingResult {
  overall_score: number;
  letter_grade: string;
  rubric_scores: RubricScore[];
  overall_feedback: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const requestBody = await req.json();
    console.log('Raw request body:', JSON.stringify(requestBody, null, 2));
    
    const { assignment_id, journal_content, student_id, journal_id, rubric }: GradingRequest = requestBody;

    console.log('Extracted values:');
    console.log('- assignment_id:', assignment_id);
    console.log('- student_id:', student_id); 
    console.log('- journal_id:', journal_id);
    console.log('- journal_content length:', journal_content?.length);

    if (!student_id) {
      console.error('student_id is missing or null:', student_id);
      throw new Error('Missing required field: student_id');
    }
    
    if (!assignment_id) {
      throw new Error('Missing required field: assignment_id');
    }
    
    if (!journal_content) {
      throw new Error('Missing required field: journal_content');
    }

    // Default rubric for listening journals
    const defaultRubric = {
      criteria: [
        {
          name: 'Content Quality',
          description: 'Demonstrates deep listening and musical understanding',
          max_points: 25
        },
        {
          name: 'Musical Analysis',
          description: 'Identifies and analyzes musical elements (rhythm, melody, harmony, etc.)',
          max_points: 25
        },
        {
          name: 'Personal Reflection',
          description: 'Provides thoughtful personal response and connections',
          max_points: 25
        },
        {
          name: 'Writing Quality',
          description: 'Clear, organized, and well-written with proper grammar',
          max_points: 25
        }
      ]
    };

    const activeRubric = rubric || defaultRubric;

    // Create detailed prompt for GPT
    const rubricPrompt = `
You are an expert music instructor grading a listening journal entry. Grade this journal based on the following rubric:

${activeRubric.criteria.map(c => `
${c.name} (${c.max_points} points): ${c.description}
`).join('')}

Journal Content:
"${journal_content}"

Grade each criterion and provide specific feedback. Return your response as a JSON object with this exact structure:
{
  "rubric_scores": [
    {
      "criterion": "Content Quality",
      "score": [number],
      "max_score": ${activeRubric.criteria[0].max_points},
      "feedback": "[specific feedback for this criterion]"
    }
    // ... continue for all criteria
  ],
  "overall_feedback": "[overall constructive feedback about the journal]"
}

Be constructive, specific, and encouraging in your feedback. Focus on musical elements and listening skills.
`;

    console.log('Sending request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional music instructor with expertise in grading listening assignments. Always respond with valid JSON only.'
          },
          { role: 'user', content: rubricPrompt }
        ],
        max_completion_tokens: 1000
        // Note: temperature not supported in GPT-5 models
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    console.log('OpenAI response received');

    let gradingResult: GradingResult;
    
    try {
      const aiContent = aiResponse.choices[0].message.content;
      const parsed = JSON.parse(aiContent);
      
      // Calculate overall score
      const totalScore = parsed.rubric_scores.reduce((sum: number, score: RubricScore) => sum + score.score, 0);
      const maxScore = parsed.rubric_scores.reduce((sum: number, score: RubricScore) => sum + score.max_score, 0);
      const overallScore = Math.round((totalScore / maxScore) * 100);
      
      // Determine letter grade
      let letterGrade = 'F';
      if (overallScore >= 90) letterGrade = 'A';
      else if (overallScore >= 80) letterGrade = 'B';
      else if (overallScore >= 70) letterGrade = 'C';
      else if (overallScore >= 60) letterGrade = 'D';
      
      gradingResult = {
        overall_score: overallScore,
        letter_grade: letterGrade,
        rubric_scores: parsed.rubric_scores,
        overall_feedback: parsed.overall_feedback
      };
      
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      
      // Fallback grading
      gradingResult = {
        overall_score: 85,
        letter_grade: 'B',
        rubric_scores: activeRubric.criteria.map(criterion => ({
          criterion: criterion.name,
          score: Math.round(criterion.max_points * 0.85),
          max_score: criterion.max_points,
          feedback: 'Good work on this criterion. AI grading encountered a parsing error.'
        })),
        overall_feedback: 'Good listening journal entry. The AI grading system encountered a technical issue, so this is a default grade. Please have your instructor review manually.'
      };
    }

    // Store the grade in the database
    const gradeData = {
      student_id,
      assignment_id,
      journal_id,
      overall_score: gradingResult.overall_score,
      // letter_grade is auto-generated, don't insert it
      rubric: {
        criteria: activeRubric.criteria,
        scores: gradingResult.rubric_scores
      },
      feedback: gradingResult.overall_feedback,
      ai_model: 'gpt-5-2025-08-07',
      graded_by: null, // AI grading
      graded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: grade, error: gradeError } = await supabase
      .from('mus240_journal_grades')
      .upsert(gradeData)
      .select()
      .single();

    if (gradeError) {
      console.error('Error saving grade:', gradeError);
      throw new Error(`Failed to save grade: ${gradeError.message}`);
    }

    console.log('Grade saved successfully:', grade.id);

    return new Response(
      JSON.stringify({
        success: true,
        grade: gradingResult,
        grade_id: grade.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in grade-journal function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

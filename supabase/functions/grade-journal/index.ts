import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
};

serve(async (req) => {
  console.log('=== STARTING JOURNAL GRADING FUNCTION ===');
  console.log('Request URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  // Environment check
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  console.log('Supabase URL configured:', !!supabaseUrl);
  console.log('Service role configured:', !!supabaseServiceRoleKey);
  console.log('OpenAI API key configured:', !!openaiApiKey);

  if (!openaiApiKey) {
    return new Response(JSON.stringify({ 
      error: 'OpenAI API key not configured' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('=== PARSING REQUEST ===');
    console.log('Request method:', req.method);
    
    const body = await req.json();
    console.log('Request body keys:', Object.keys(body));
    
    const { student_id, assignment_id, journal_text, rubric } = body;
    
    console.log('Extracted values:');
    console.log('- student_id:', student_id);
    console.log('- assignment_id:', assignment_id);
    console.log('- journal_text length:', journal_text?.length);
    
    if (!journal_text) {
      return new Response(JSON.stringify({
        error: 'No journal text provided'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic word count check
    const wordCount = journal_text.trim().split(/\s+/).length;
    console.log('Word count:', wordCount, 'Word range OK:', wordCount >= 200 && wordCount <= 350);

    if (wordCount < 100) {
      return new Response(JSON.stringify({
        error: 'Journal entry too short. Minimum 100 words required.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== CALLING OPENAI API ===');
    console.log('OpenAI API key length:', openaiApiKey.length);
    
    // Build the grading prompt
    let gradingPrompt = `You are an expert music professor grading a student listening journal for MUS 240: African American Music.

Please evaluate this journal entry and provide detailed feedback with a numerical grade.`;

    if (rubric && rubric.criteria) {
      gradingPrompt += `\n\nGRADING RUBRIC:\n`;
      rubric.criteria.forEach((criterion: any) => {
        gradingPrompt += `- ${criterion.name} (${criterion.max_points} pts): ${criterion.description}\n`;
      });
    }

    gradingPrompt += `\n\nJOURNAL ENTRY TO GRADE:\n${journal_text}

Please provide:
1. A total numerical score out of 17 points
2. Detailed feedback on strengths and areas for improvement
3. Specific comments on musical analysis, historical context, and writing quality

Format your response as JSON with these fields:
{
  "score": [numerical score out of 17],
  "feedback": "[detailed feedback string]",
  "letter_grade": "[A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F]"
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an expert music professor. Provide fair, constructive feedback on student work. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: gradingPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    console.log('OpenAI status:', openaiResponse.status);
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({
        error: 'OpenAI API error',
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiResult = await openaiResponse.json();
    console.log('OpenAI response received');
    
    let gradingResult;
    try {
      gradingResult = JSON.parse(openaiResult.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.log('Raw response:', openaiResult.choices[0].message.content);
      
      // Fallback grading
      gradingResult = {
        score: Math.min(Math.max(Math.floor(wordCount / 20), 8), 17),
        feedback: "Your journal entry demonstrates engagement with the material. " + openaiResult.choices[0].message.content,
        letter_grade: "B"
      };
    }

    console.log('=== SAVING TO DATABASE ===');
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);
    
    // Save the grade to database
    const { data: gradeData, error: gradeError } = await supabase
      .from('mus240_journal_grades')
      .upsert({
        student_id,
        assignment_id,
        overall_score: gradingResult.score,
        feedback: gradingResult.feedback,
        letter_grade: gradingResult.letter_grade,
        graded_at: new Date().toISOString(),
        graded_by: 'ai-assistant'
      }, {
        onConflict: 'student_id,assignment_id'
      });

    if (gradeError) {
      console.error('Error saving grade:', gradeError);
      return new Response(JSON.stringify({
        error: 'Failed to save grade',
        details: gradeError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Grade saved successfully');

    return new Response(JSON.stringify({
      success: true,
      grade: gradingResult,
      message: 'Journal graded successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in grade-journal function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Grade Journal AI function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing request...');
    
    const body = await req.json();
    const { journalId, journalContent, assignmentId } = body;
    
    console.log('Received data:', { journalId, assignmentId, contentLength: journalContent?.length });
    
    // Check environment variables
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasOpenAI: !!openAIApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    if (!journalId || !journalContent) {
      throw new Error('Missing required parameters: journalId and journalContent');
    }

    console.log('Calling OpenAI API...');

    // Call OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a music education professor grading student journal entries. Provide a score out of 100 and detailed feedback.'
          },
          {
            role: 'user',
            content: `Grade this journal entry for assignment ${assignmentId}:\n\n${journalContent}\n\nProvide a JSON response with: {"score": number, "feedback": "string", "letterGrade": "string"}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI error:', openAIResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const gradingResult = openAIData.choices[0].message.content;
    
    console.log('OpenAI response received');

    // Parse AI response
    let parsedGrading;
    try {
      parsedGrading = JSON.parse(gradingResult);
    } catch (e) {
      parsedGrading = {
        score: 85,
        feedback: gradingResult,
        letterGrade: 'B+'
      };
    }

    console.log('Saving to database...');

    // Save to database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: gradeData, error: gradeError } = await supabase
      .from('mus240_journal_grades')
      .insert({
        journal_id: journalId,
        overall_score: parsedGrading.score,
        letter_grade: parsedGrading.letterGrade,
        feedback: parsedGrading.feedback,
        ai_model: 'gpt-4o-mini',
        graded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (gradeError) {
      console.error('Database error:', gradeError);
      throw new Error(`Database error: ${gradeError.message}`);
    }

    console.log('Grade saved successfully');

    return new Response(JSON.stringify({
      success: true,
      gradeId: gradeData.id,
      grading: {
        overallScore: parsedGrading.score,
        letterGrade: parsedGrading.letterGrade,
        overallFeedback: parsedGrading.feedback
      },
      message: 'Journal graded successfully by AI'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
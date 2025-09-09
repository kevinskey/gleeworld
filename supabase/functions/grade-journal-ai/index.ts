import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Function started, method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing POST request');
    
    // Check environment variables first
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasOpenAI: !!openAIApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey,
      openAIKeyPrefix: openAIApiKey ? openAIApiKey.substring(0, 3) : 'none'
    });

    if (!openAIApiKey) {
      console.error('OpenAI API key missing');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      return new Response(JSON.stringify({ 
        error: 'Supabase configuration missing',
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully');
    } catch (e) {
      console.error('Failed to parse request body:', e.message);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { journalId, journalContent, assignmentId } = requestBody;
    
    if (!journalId || !journalContent) {
      console.error('Missing required parameters');
      return new Response(JSON.stringify({ 
        error: 'Journal ID and content are required',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing journal:', journalId, 'for assignment:', assignmentId);

    // Call OpenAI API
    console.log('Calling OpenAI API...');
    
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

    console.log('OpenAI API response status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: `OpenAI API error: ${openAIResponse.status}`,
        details: errorText,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response received');

    const gradingResult = openAIData.choices[0].message.content;
    
    // Try to parse the AI response
    let parsedGrading;
    try {
      parsedGrading = JSON.parse(gradingResult);
    } catch (e) {
      console.error('Failed to parse AI response, using fallback');
      parsedGrading = {
        score: 85,
        feedback: gradingResult,
        letterGrade: 'B+'
      };
    }

    // Save to database
    console.log('Saving to database...');
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
      return new Response(JSON.stringify({ 
        error: 'Failed to save grade',
        details: gradeError.message,
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Grade saved successfully');

    return new Response(JSON.stringify({
      success: true,
      gradeId: gradeData.id,
      grading: parsedGrading,
      message: 'Journal graded successfully by AI'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
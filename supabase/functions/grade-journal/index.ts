import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== GRADE JOURNAL FUNCTION START ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);

    // Environment check
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:');
    console.log('- OpenAI key:', !!OPENAI_API_KEY);
    console.log('- Supabase URL:', !!SUPABASE_URL);
    console.log('- Service role:', !!SERVICE_ROLE_KEY);

    if (!OPENAI_API_KEY) {
      console.error('Missing OpenAI API key');
      return new Response(JSON.stringify({ error: 'Missing OpenAI API key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials');
      return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let body: any;
    try {
      body = await req.json();
      console.log('Body parsed successfully:', Object.keys(body));
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { student_id, assignment_id, journal_text, rubric } = body;

    // Validate required fields
    if (!student_id || !assignment_id || !journal_text) {
      console.error('Missing required fields');
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        received: { student_id: !!student_id, assignment_id: !!assignment_id, journal_text: !!journal_text }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== CALLING OPENAI ===');
    
    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert music educator grading student journal entries. Return your response as valid JSON with this exact structure: {"scores": [{"criterion": "Musical Analysis", "score": number, "max_score": 7, "feedback": "string"}], "overall_feedback": "string", "metadata": {"word_count": number, "word_range_ok": boolean}}'
          },
          {
            role: 'user',
            content: `Please grade this music journal entry:\n\n${journal_text}\n\nRubric: ${JSON.stringify(rubric || {})}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    console.log('OpenAI response status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'OpenAI API failed',
        status: openAIResponse.status,
        details: errorText
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response received');

    // Parse AI response
    let gradingResult;
    try {
      const aiContent = openAIData.choices[0].message.content;
      gradingResult = JSON.parse(aiContent);
      console.log('AI result parsed successfully');
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      gradingResult = {
        scores: [
          { criterion: "Musical Analysis", score: 5, max_score: 7, feedback: "AI grading error" },
          { criterion: "Historical Context", score: 4, max_score: 5, feedback: "AI grading error" },
          { criterion: "Terminology Usage", score: 2, max_score: 3, feedback: "AI grading error" },
          { criterion: "Writing Quality", score: 2, max_score: 2, feedback: "AI grading error" }
        ],
        overall_feedback: "AI grading encountered an error. Manual review required.",
        metadata: { word_count: journal_text.split(' ').length, word_range_ok: true }
      };
    }

    console.log('=== SAVING TO DATABASE ===');

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Calculate overall score
    const overall_score = gradingResult.scores?.reduce((sum, score) => sum + (score.score || 0), 0) || 65;

    // Prepare grade data
    const gradeData = {
      student_id,
      assignment_id,
      journal_id: body.journal_id || null,
      overall_score,
      rubric: gradingResult,
      feedback: gradingResult.overall_feedback || "AI grading completed",
      ai_model: 'gpt-4o-mini',
      graded_by: null,
      graded_at: new Date().toISOString(),
    };

    console.log('Inserting grade data');

    // Insert grade into database
    const { data: insertData, error: insertError } = await supabase
      .from('mus240_journal_grades')
      .insert([gradeData])
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(JSON.stringify({ 
        error: 'Database insert failed',
        details: insertError
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== SUCCESS ===');

    return new Response(JSON.stringify({
      success: true,
      grade: {
        id: insertData.id,
        assignment_id,
        student_id,
        overall_score,
        rubric_scores: gradingResult.scores || [],
        feedback: gradingResult.overall_feedback || "AI grading completed",
        ai_model: 'gpt-4o-mini',
        graded_at: new Date().toISOString(),
        metadata: gradingResult.metadata || {}
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== UNHANDLED ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
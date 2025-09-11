import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

serve(async (req) => {
  console.log('=== STARTING JOURNAL GRADING FUNCTION ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('OpenAI API key length:', OPENAI_API_KEY?.length || 'MISSING');

  if (req.method === 'OPTIONS') {
    console.log('Returning CORS response');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== GRADE-JOURNAL FUNCTION START ===');
    console.log('Supabase service key configured:', !!SUPABASE_SERVICE_ROLE_KEY);
    console.log('Supabase URL configured:', !!SUPABASE_URL);
    console.log('OpenAI API key configured:', !!OPENAI_API_KEY);

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== PARSING REQUEST ===');
    const body = await req.json();
    console.log('Request body keys:', Object.keys(body));

    const { student_id, assignment_id, journal_text, rubric } = body;

    console.log('Extracted values:');
    console.log('- assignment_id:', assignment_id);
    console.log('- student_id:', student_id);
    console.log('- journal_content length:', journal_text?.length);

    if (!student_id || !assignment_id || !journal_text) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        details: { student_id: !!student_id, assignment_id: !!assignment_id, journal_text: !!journal_text }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count words for validation
    const wordCount = journal_text.trim().split(/\s+/).length;
    const wordRangeOk = wordCount >= 250 && wordCount <= 300;
    console.log('Word count:', wordCount, 'Word range OK:', wordRangeOk);

    console.log('=== CALLING OPENAI API ===');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Use legacy model that supports temperature
        messages: [
          {
            role: 'system',
            content: `You are a music professor grading listening journal entries. 

Evaluate the following journal entry based on these criteria:
1. Musical Analysis (7 points max): Identifies genre, style traits, and musical features
2. Historical Context (5 points max): Connects musical features to historical and cultural significance  
3. Terminology Usage (3 points max): Uses correct musical terminology appropriately
4. Writing Quality (2 points max): Clear, organized writing with proper grammar and 250-300 words

Return ONLY a JSON object with this exact structure:
{
  "scores": [
    {"criterion": "Musical Analysis", "score": number, "max_score": 7, "feedback": "string"},
    {"criterion": "Historical Context", "score": number, "max_score": 5, "feedback": "string"},
    {"criterion": "Terminology Usage", "score": number, "max_score": 3, "feedback": "string"},
    {"criterion": "Writing Quality", "score": number, "max_score": 2, "feedback": "string"}
  ],
  "overall_score": number,
  "feedback": "Overall feedback string",
  "metadata": {
    "word_count": ${wordCount},
    "word_range_ok": ${wordRangeOk}
  }
}`
          },
          {
            role: 'user',
            content: `Journal Entry:\n${journal_text}\n\nRubric Context:\n${JSON.stringify(rubric || {})}`
          }
        ],
        temperature: 0.2,
        max_tokens: 800
      })
    });

    console.log('OpenAI status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'OpenAI API failed', 
        status: response.status,
        details: errorText
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    console.log('=== OPENAI RESPONSE RECEIVED ===');
    console.log('Full AI response:', JSON.stringify(aiResponse, null, 2));

    const aiContent = aiResponse.choices?.[0]?.message?.content;
    console.log('AI content to parse:', aiContent);

    let gradingResult;
    let overall_score = 65; // Default fallback score
    let feedback = "Good listening journal entry. The AI grading system encountered a technical issue, so this is a default grade. Please have your instructor review manually.";

    try {
      if (aiContent && aiContent.trim()) {
        // Try to parse the AI response
        const cleanedContent = aiContent.trim();
        gradingResult = JSON.parse(cleanedContent);
        
        if (gradingResult.overall_score) {
          overall_score = gradingResult.overall_score;
        }
        if (gradingResult.feedback) {
          feedback = gradingResult.feedback;
        }
        
        console.log('Successfully parsed AI response:', gradingResult);
      } else {
        throw new Error('Empty AI response content');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      
      // Create fallback scoring
      gradingResult = {
        scores: [
          { criterion: "Musical Analysis", score: 5, max_score: 7, feedback: "AI grading encountered a parsing error. Please have your instructor review manually." },
          { criterion: "Historical Context", score: 4, max_score: 5, feedback: "AI grading encountered a parsing error. Please have your instructor review manually." },
          { criterion: "Terminology Usage", score: 2, max_score: 3, feedback: "AI grading encountered a parsing error. Please have your instructor review manually." },
          { criterion: "Writing Quality", score: 2, max_score: 2, feedback: "AI grading encountered a parsing error. Please have your instructor review manually." }
        ],
        metadata: {
          word_count: wordCount,
          word_range_ok: wordRangeOk
        }
      };
    }

    console.log('=== ATTEMPTING DATABASE INSERT ===');

    // Look up assignment database ID
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
      auth: { persistSession: false } 
    });

    const { data: assignmentData, error: assignmentError } = await supabase
      .from('mus240_assignments')
      .select('id')
      .eq('assignment_id', assignment_id)
      .single();

    let assignment_db_id = null;
    if (assignmentData && !assignmentError) {
      assignment_db_id = assignmentData.id;
      console.log('Mapping assignment_id:', assignment_id, '-> assignment_db_id:', assignment_db_id);
    }

    console.log('=== PREPARING DATABASE INSERT ===');
    const gradeData = {
      student_id,
      assignment_id,
      assignment_db_id,
      journal_id: body.journal_id,
      overall_score,
      rubric: gradingResult,
      feedback,
      ai_model: 'gpt-5-mini-2025-08-07',
      graded_by: null, // Let the database set this
      graded_at: new Date().toISOString()
    };

    console.log('About to insert grade data:', JSON.stringify(gradeData, null, 2));

    console.log('=== DATABASE INSERT ===');
    const { data: insertData, error: insertError } = await supabase
      .from('mus240_journal_grades')
      .insert([gradeData])
      .select()
      .single();

    if (insertError) {
      console.log('=== DATABASE INSERT FAILED ===');
      console.log('Grade data that failed:', JSON.stringify(gradeData, null, 2));
      console.error('=== ERROR IN GRADE-JOURNAL FUNCTION ===');
      console.error('Error code:', insertError.code);
      console.error('Error hint:', insertError.hint);
      console.error('Error message:', insertError.message);
      console.error('Error details:', insertError.details);
      console.error('Error type:', typeof insertError);
      console.error('Error name:', insertError.name);
      console.error('Full error object:', insertError);
      console.error('Error stack:', new Error(`Failed to save grade: ${insertError.message}`).stack);
      
      return new Response(JSON.stringify({ 
        error: 'Database insert failed',
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== SUCCESS ===');
    console.log('Grade saved successfully:', insertData);

    return new Response(JSON.stringify({ 
      ok: true, 
      overall_score, 
      feedback,
      grade_id: insertData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== UNHANDLED ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
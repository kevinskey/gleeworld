import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, cache-control, pragma",
};

const J = (s: number, b: any) =>
  new Response(JSON.stringify(b), { 
    status: s, 
    headers: { "Content-Type":"application/json", ...CORS }
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  console.log('=== STARTING JOURNAL GRADING FUNCTION ===');
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('OpenAI API key configured:', !!OPENAI_API_KEY);
  console.log('Supabase URL configured:', !!SUPABASE_URL);
  console.log('Service role configured:', !!SERVICE_ROLE);

  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method === "GET") return new Response(JSON.stringify({ ok: true, phase: "health" }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

  try {
    if (!OPENAI_API_KEY) {
      console.error('Missing OpenAI API key');
      return new Response(JSON.stringify({ error: "missing_openai_key" }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (!SUPABASE_URL) {
      console.error('Missing Supabase URL');
      return new Response(JSON.stringify({ error: "missing_supabase_url" }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (!SERVICE_ROLE) {
      console.error('Missing service role key');
      return new Response(JSON.stringify({ error: "missing_service_role" }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== PARSING REQUEST ===');
    let body: any = {};
    try { 
      body = await req.json(); 
    } catch { 
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      }); 
    }
    console.log('Request body keys:', Object.keys(body));

    // DIAG mode for debugging
    if (body?.mode === "diag") {
      const out: any = { ok: false, phase: "diag" };
      out.secrets = {
        has_SUPABASE_URL: !!SUPABASE_URL,
        has_SERVICE_ROLE: !!SERVICE_ROLE,
        has_OPENAI_API_KEY: !!OPENAI_API_KEY,
      };
      try {
        const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
        const { error } = await sb.from("mus240_journal_grades").select("id").limit(1);
        out.db = { ok: !error, error: error?.message || null };
      } catch (e: any) { 
        out.db = { ok: false, error: String(e?.message || e) }; 
      }
      try {
        const r = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
        });
        out.openai = { ok: r.ok, status: r.status, text: r.ok ? "ok" : await r.text().catch(() => null) };
      } catch (e: any) { 
        out.openai = { ok: false, error: String(e?.message || e) }; 
      }
      return new Response(JSON.stringify(out), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // DRY mode for testing  
    if (body?.mode === "dry") {
      return new Response(JSON.stringify({ ok: true, phase: "dry", message: "Handler reached, no AI/DB calls made" }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { student_id, assignment_id, journal_text, rubric } = body;

    console.log('Extracted values:');
    console.log('- assignment_id:', assignment_id);
    console.log('- student_id:', student_id);
    console.log('- journal_text length:', journal_text?.length);

    if (!student_id || !assignment_id || !journal_text) {
      return new Response(JSON.stringify({ 
        error: 'missing_fields',
        details: { student_id: !!student_id, assignment_id: !!assignment_id, journal_text: !!journal_text }
      }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Count words for validation
    const wordCount = journal_text.trim().split(/\s+/).length;
    const wordRangeOk = wordCount >= 250 && wordCount <= 300;
    console.log('Word count:', wordCount, 'Word range OK:', wordRangeOk);

    console.log('=== CALLING OPENAI API ===');
    console.log('OpenAI API key length:', OPENAI_API_KEY.length);

    const ac = new AbortController();
    const to = setTimeout(() => ac.abort("timeout"), 15000);
    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: ac.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Legacy model that supports temperature parameter
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
    clearTimeout(to);

    console.log('OpenAI status:', aiResp.status);

    if (!aiResp.ok) {
      const errorText = await aiResp.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'openai_failed', 
        status: aiResp.status,
        body: errorText
      }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await aiResp.json();
    console.log('=== OPENAI RESPONSE RECEIVED ===');
    console.log('Full AI response:', JSON.stringify(aiResponse, null, 2));

    let aiContent = aiResponse?.choices?.[0]?.message?.content ?? "";
    // strip common formatting fences if model disobeys
    aiContent = aiContent.replace(/^```(?:json)?/i, "").replace(/```$/,"").trim();
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

    // Use service role for database operations (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
      db: { schema: "public" }
    });

    // Look up assignment database ID (optional and safe)
    let assignment_db_id: string | null = null;
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('mus240_assignments')
      .select('id')
      .eq('assignment_id', assignment_id)
      .maybeSingle();
    if (assignmentError) console.warn("assignment lookup error:", assignmentError.message);
    assignment_db_id = assignmentData?.id ?? null; // proceed even if null

    console.log('=== PREPARING DATABASE INSERT ===');
    const gradeData = {
      student_id,
      assignment_id,
      // assignment_db_id, // leave out unless column exists
      journal_id: body.journal_id ?? null,
      overall_score: overall_score || 65, // Ensure we always have a number for NOT NULL field
      rubric: gradingResult || {}, // Ensure we always have an object for NOT NULL jsonb field
      feedback: feedback || "AI grading completed",
      ai_model: 'gpt-4o-mini',
      graded_by: null,
      graded_at: new Date().toISOString(),
    };

    console.log('About to insert grade data:', JSON.stringify(gradeData, null, 2));

    console.log('=== DATABASE INSERT ===');
    const { data: insertData, error: insErr } = await supabase
      .from('mus240_journal_grades')
      .insert([gradeData])
      .select()
      .single();
    
    if (insErr) {
      console.log('=== DATABASE INSERT FAILED ===');
      console.log('Grade data that failed:', JSON.stringify(gradeData, null, 2));
      console.error('=== ERROR IN GRADE-JOURNAL FUNCTION ===');
      console.error('Error code:', insErr.code);
      console.error('Error hint:', insErr.hint);
      console.error('Error message:', insErr.message);
      console.error('Error details:', insErr.details);
      
      return new Response(JSON.stringify({
        stage: "db_insert",
        error: "db_insert_failed",
        code: insErr.code, 
        details: insErr.details, 
        hint: insErr.hint, 
        message: insErr.message 
      }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== SUCCESS ===');
    console.log('Grade saved successfully:', insertData);

    return new Response(JSON.stringify({
      success: true,
      grade: {
        id: insertData.id,
        assignment_id,
        student_id,
        journal_id: body.journal_id ?? null,
        overall_score,
        letter_grade: null,
        rubric_scores: gradingResult?.scores ?? [],
        overall_feedback: feedback,
        overall_points_without_peer: gradingResult?.scores?.reduce?.((s: number, r: any)=>s+(r?.score||0),0) ?? overall_score,
        max_points_overall: 17, // 7+5+3+2
        overall_score_percent_without_peer: (((gradingResult?.scores?.reduce?.((s: number, r: any)=>s+(r?.score||0),0) ?? 0) / 17) * 100),
        metadata: gradingResult?.metadata ?? { word_count: null, word_range_ok: null }
      }
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== UNHANDLED ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'unhandled',
      stage: 'top_catch',
      message: String(error?.message || error) 
    }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  "https://gleeworld.org",
  "https://radio.gleeworld.org",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(origin: string | null) {
  const o = origin ?? "";
  const allowed =
    o.startsWith("https://") && o.endsWith(".lovableproject.com") ||
    ALLOWED_ORIGINS.has(o);
  return {
    "Access-Control-Allow-Origin": allowed ? o : "https://gleeworld.org",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

interface GenerateRequest {
  keySignature: string;
  timeSignature: string;
  tempo: number;
  measures: number;
  register: string;
  pitchRangeMin: string;
  pitchRangeMax: string;
  motionTypes: string[];
  noteLengths: string[];
  difficultyLevel: number;
  title?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Missing OPENAI_API_KEY" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }

  const params: GenerateRequest = await req.json().catch(() => ({
    keySignature: "C major",
    timeSignature: "4/4", 
    tempo: 120,
    measures: 4,
    register: "soprano",
    pitchRangeMin: "C4",
    pitchRangeMax: "C5",
    motionTypes: ["stepwise"],
    noteLengths: ["quarter", "half"],
    difficultyLevel: 2,
    title: "Sight-Singing Exercise"
  }));

  const input = `Create MusicXML for a ${params.measures}-bar sight-singing exercise in ${params.keySignature} at ${params.tempo} bpm. Time signature: ${params.timeSignature}. Register: ${params.register}. Use ${params.motionTypes?.join(" and ")} motion with ${params.noteLengths?.join(" and ")} notes. Output only valid MusicXML format with proper structure including divisions, key signature, time signature, and clef.`;

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5-mini-2025-08-07",
      input: input
    })
  });

  if (!r.ok) {
    return new Response(JSON.stringify({
      success: false,
      error: `OpenAI API error: ${r.status}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
    });
  }

  const musicXML = await r.text();

  // Store in database if user is authenticated
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const supabaseUrl = 'https://oopmlreysjzuxzylyheb.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from('sight_singing_exercises').insert({
          user_id: user.id,
          title: params.title,
          key_signature: params.keySignature,
          time_signature: params.timeSignature,
          tempo: params.tempo,
          measures: params.measures,
          register: params.register,
          pitch_range_min: params.pitchRangeMin,
          pitch_range_max: params.pitchRangeMax,
          motion_types: params.motionTypes,
          note_lengths: params.noteLengths,
          difficulty_level: params.difficultyLevel,
          musicxml_content: musicXML
        });
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    musicXML: musicXML
  }), {
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
  });
});
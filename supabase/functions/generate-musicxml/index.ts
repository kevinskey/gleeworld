import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  
  // Debug logging
  console.log("OPENAI_API_KEY exists:", !!Deno.env.get("OPENAI_API_KEY"));
  console.log("API key length:", apiKey.length);
  console.log("API key starts with sk-:", apiKey.startsWith("sk-"));
  
  if (!apiKey) {
    return new Response(JSON.stringify({
      success: false,
      error: "Missing OPENAI_API_KEY",
      debug: { 
        openAIApiKey_exists: !!Deno.env.get("OPENAI_API_KEY"),
        openAIApiKey_length: apiKey.length,
        message: "API key not found in environment variables"
      }
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
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

  const prompt = `Create MusicXML for a ${params.measures}-bar sight-singing exercise in ${params.keySignature} at ${params.tempo} bpm. Time signature: ${params.timeSignature}. Register: ${params.register}. Use ${params.motionTypes?.join(" and ")} motion with ${params.noteLengths?.join(" and ")} notes. Output only valid MusicXML format with proper structure including divisions, key signature, time signature, and clef.`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5-mini-2025-08-07",
      messages: [
        { role: "system", content: "You are a music composition assistant that generates valid MusicXML for sight-singing exercises. Always output properly formatted MusicXML." },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 2000
    })
  });

  if (!r.ok) {
    return new Response(JSON.stringify({
      success: false,
      error: `OpenAI API error: ${r.status}`,
      debug: { openAIApiKey_exists: true }
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const data = await r.json();
  const musicXML = data.choices[0].message.content;

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
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
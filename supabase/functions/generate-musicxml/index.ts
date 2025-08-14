import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOW = new Set([
  "https://gleeworld.org",
  "https://radio.gleeworld.org",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://68e737ff-b69d-444d-8896-ed604144004c.lovableproject.com", // your current Lovable origin
]);

function cors(origin: string | null, status = 200, extra: HeadersInit = {}) {
  const o = origin ?? "";
  const allowed = ALLOW.has(o) || o.endsWith(".lovableproject.com");
  return {
    status,
    headers: {
      "Content-Type": "application/json",
      "Vary": "Origin",
      "Access-Control-Allow-Origin": allowed ? o : "https://gleeworld.org",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      // reflect requested headers to satisfy preflight
      "Access-Control-Allow-Headers": (extra as any)["Access-Control-Allow-Headers"] ??
        "authorization, content-type, apikey, x-client-info",
      "Access-Control-Max-Age": "86400",
      ...extra,
    },
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
  if (req.method === "OPTIONS") {
    // Echo requested headers for preflight
    const reqHeaders = req.headers.get("access-control-request-headers") ?? "";
    return new Response(null, cors(origin, 204, { "Access-Control-Allow-Headers": reqHeaders }));
  }

  // ---- your existing logic below ----
  console.log("OPENAI set:", !!Deno.env.get("OPENAI_API_KEY"));
  console.log("ENV check timestamp:", new Date().toISOString());
  
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    // Temporary mock response for testing
    const mockMusicXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Voice</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

    return new Response(JSON.stringify({
      success: true,
      musicXML: mockMusicXML
    }), cors(origin, 200));
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
    }),
  });

  if (!r.ok) {
    return new Response(JSON.stringify({
      success: false,
      error: `OpenAI API error: ${r.status}`
    }), cors(origin, 500));
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
  }), cors(origin, 200));
});
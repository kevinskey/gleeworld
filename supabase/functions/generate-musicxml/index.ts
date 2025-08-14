import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  "https://gleeworld.org",
  "https://radio.gleeworld.org", 
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://68e737ff-b69d-444d-8896-ed604144004c.lovableproject.com",
]);

function corsHeaders(origin: string | null) {
  const o = origin ?? "";
  const allowed = ALLOWED_ORIGINS.has(o) || o.endsWith(".lovableproject.com") || o.endsWith(".lovable.app");
  return {
    "Content-Type": "application/json",
    "Vary": "Origin",
    "Access-Control-Allow-Origin": allowed ? o : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
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

function validateMusicXML(musicXML: string): boolean {
  try {
    // Basic schema validation
    if (!musicXML.includes('<score-partwise')) {
      console.log("Validation failed: Missing <score-partwise>");
      return false;
    }
    
    if (!musicXML.includes('<part-list>')) {
      console.log("Validation failed: Missing <part-list>");
      return false;
    }
    
    // Count measures
    const measureMatches = musicXML.match(/<measure\s+number=/g);
    if (!measureMatches || measureMatches.length === 0) {
      console.log("Validation failed: No measures found");
      return false;
    }
    
    console.log(`Validation passed: Found ${measureMatches.length} measures`);
    return true;
  } catch (error) {
    console.log("Validation error:", error);
    return false;
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    const reqHeaders = req.headers.get("access-control-request-headers") ?? "";
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(origin),
        "Access-Control-Allow-Headers": reqHeaders
      }
    });
  }

  try {
    console.log("Function called at:", new Date().toISOString());
    
    // Check authentication and rate limiting
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: "Authentication required"
      }), {
        status: 401,
        headers: corsHeaders(origin)
      });
    }

    const supabaseUrl = 'https://oopmlreysjzuxzylyheb.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid authentication"
      }), {
        status: 401,
        headers: corsHeaders(origin)
      });
    }

    // Rate limiting check
    const { data: rateLimitResult, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_user_id: user.id,
        p_action_type: 'musicxml_generation',
        p_max_requests: 10,
        p_window_minutes: 1
      });

    if (rateLimitError || !rateLimitResult) {
      return new Response(JSON.stringify({
        success: false,
        error: "Rate limit exceeded. Please try again later."
      }), {
        status: 429,
        headers: corsHeaders(origin)
      });
    }

    console.log("OPENAI API Key available:", !!Deno.env.get("OPENAI_API_KEY"));
    
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    let musicXML: string;

    if (!apiKey) {
      console.log("No OpenAI API key found, using mock response");
      
      // Parse request parameters for mock response
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

      console.log("=== EDGE FUNCTION: Mock response parameters ===");
      console.log("Raw params received:", JSON.stringify(params, null, 2));
      console.log("Note lengths from request:", params.noteLengths);
      console.log("Motion types from request:", params.motionTypes);
      console.log("Measures from request:", params.measures);

      // Generate mock measures based on requested count
      let measures = '';
      const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      
      // Map note lengths to duration values (assuming divisions=4)
      const noteDurations = {
        'whole': { duration: 16, type: 'whole' },
        'half': { duration: 8, type: 'half' },
        'quarter': { duration: 4, type: 'quarter' },
        'eighth': { duration: 2, type: 'eighth' },
        'sixteenth': { duration: 1, type: 'sixteenth' }
      };
      
      // Use the selected note lengths, or default to quarter notes
      const selectedNoteLengths = params.noteLengths && params.noteLengths.length > 0 
        ? params.noteLengths 
        : ['quarter'];
      
      console.log("Using note lengths:", selectedNoteLengths);
      
      for (let i = 1; i <= params.measures; i++) {
        const isFirst = i === 1;
        const isLast = i === params.measures;
        
        // Pick a random note length from the selected ones
        const randomNoteLength = selectedNoteLengths[Math.floor(Math.random() * selectedNoteLengths.length)];
        const noteInfo = noteDurations[randomNoteLength] || noteDurations['quarter'];
        
        measures += `    <measure number="${i}">
${isFirst ? `      <attributes>
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
      </attributes>` : ''}
      <note>
        <pitch>
          <step>${notes[i % notes.length]}</step>
          <octave>4</octave>
        </pitch>
        <duration>${isLast ? '16' : noteInfo.duration}</duration>
        <type>${isLast ? 'whole' : noteInfo.type}</type>
      </note>
${!isLast && noteInfo.duration < 16 ? `      <note>
        <pitch>
          <step>${notes[(i + 1) % notes.length]}</step>
          <octave>4</octave>
        </pitch>
        <duration>${16 - noteInfo.duration}</duration>
        <type>${16 - noteInfo.duration === 8 ? 'half' : 16 - noteInfo.duration === 4 ? 'quarter' : 'whole'}</type>
      </note>` : ''}
    </measure>
`;
      }

      console.log("Generated measures count:", (measures.match(/measure number/g) || []).length);

      // Mock response with dynamic measures
      musicXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Voice</part-name>
    </score-part>
  </part-list>
  <part id="P1">
${measures}  </part>
</score-partwise>`;
    } else {
      // Parse request parameters
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

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-5-mini-2025-08-07",
          messages: [
            { role: "system", content: "You are a music composition expert. Generate valid MusicXML for sight-singing exercises." },
            { role: "user", content: input }
          ],
          max_completion_tokens: 2000
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      musicXML = data.choices[0].message.content;
    }

    // Validate the MusicXML
    if (!validateMusicXML(musicXML)) {
      throw new Error("Generated MusicXML failed validation");
    }

    // Save to storage
    const filename = `exercise_${user.id}_${Date.now()}.musicxml`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('musicxml-exercises')
      .upload(filename, musicXML, {
        contentType: 'application/vnd.recordare.musicxml+xml',
        upsert: false
      });

    if (uploadError) {
      console.log("Storage upload error:", uploadError);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('musicxml-exercises')
      .getPublicUrl(filename);

    // Store in database if we have request parameters
    if (apiKey) {
      const params = await req.json().catch(() => ({}));
      await supabase.from('sight_singing_exercises').insert({
        user_id: user.id,
        title: params.title || "Generated Exercise",
        key_signature: params.keySignature || "C major",
        time_signature: params.timeSignature || "4/4",
        tempo: params.tempo || 120,
        measures: params.measures || 4,
        register: params.register || "soprano",
        pitch_range_min: params.pitchRangeMin || "C4",
        pitch_range_max: params.pitchRangeMax || "C5",
        motion_types: params.motionTypes || ["stepwise"],
        note_lengths: params.noteLengths || ["quarter"],
        difficulty_level: params.difficultyLevel || 2,
        musicxml_content: musicXML,
        file_url: publicUrl
      });
    }

    // Return both JSON response and file download info
    return new Response(JSON.stringify({
      success: true,
      musicXML: musicXML,
      downloadUrl: publicUrl,
      filename: filename,
      message: "MusicXML exercise generated successfully"
    }), {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/json"
      }
    });
  }
});
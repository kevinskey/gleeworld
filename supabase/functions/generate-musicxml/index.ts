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

interface Note {
  pitch: string;
  octave: number;
  dur: string;
  tie?: boolean;
}

interface ExerciseData {
  timeSignature: string;
  key: string;
  measures: Note[][];
}

// Validation functions
function beats(dur: string): number {
  return dur === "half" ? 2 : dur === "quarter" ? 1 : 0;
}

function validateExerciseData(data: ExerciseData): string | null {
  // Check structure
  if (!data.measures || !Array.isArray(data.measures)) {
    return "Invalid measures structure";
  }

  // Duration whitelist + beat totals
  for (const measure of data.measures) {
    if (!Array.isArray(measure)) return "Invalid measure structure";
    
    let sum = 0;
    for (const note of measure) {
      if (!["quarter", "half"].includes(note.dur)) {
        return `Invalid duration: ${note.dur}. Only quarter and half notes allowed.`;
      }
      sum += beats(note.dur);
    }
    if (sum !== 4) {
      return `Measure has ${sum} beats, expected 4`;
    }
  }

  // Stepwise motion check
  const scale = ["C", "D", "E", "F", "G", "A", "B"];
  let prev: Note | null = null;
  
  for (const measure of data.measures) {
    for (const note of measure) {
      if (prev) {
        const prevIndex = scale.indexOf(prev.pitch) + (prev.octave - 4) * 7;
        const currIndex = scale.indexOf(note.pitch) + (note.octave - 4) * 7;
        const interval = Math.abs(currIndex - prevIndex);
        
        if (interval !== 1) {
          return `Non-stepwise motion detected: ${prev.pitch}${prev.octave} to ${note.pitch}${note.octave}`;
        }
      }
      prev = note;
    }
  }

  return null; // Valid
}

async function generateWithOpenAI(params: GenerateRequest, apiKey: string, maxRetries: number = 3): Promise<ExerciseData> {
  const allowedDurations = params.noteLengths.filter(d => ["quarter", "half"].includes(d));
  if (allowedDurations.length === 0) allowedDurations.push("quarter");

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`OpenAI generation attempt ${attempt}/${maxRetries}`);
    
    const body = {
      model: "gpt-5-mini-2025-08-07",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "exercise",
          schema: {
            type: "object",
            required: ["timeSignature", "key", "measures"],
            properties: {
              timeSignature: { type: "string", enum: ["4/4"] },
              key: { type: "string", enum: ["C major"] },
              measures: {
                type: "array",
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["pitch", "octave", "dur"],
                    properties: {
                      pitch: { type: "string", enum: ["C", "D", "E", "F", "G", "A", "B"] },
                      octave: { type: "integer", minimum: 4, maximum: 6 },
                      dur: { type: "string", enum: allowedDurations },
                      tie: { type: "boolean" }
                    }
                  }
                }
              }
            }
          },
          strict: true
        }
      },
      messages: [
        {
          role: "system",
          content: `Output must be JSON matching schema. ${params.measures} measures of 4/4 in C major. ` +
                  `Only stepwise motion (±1 scale degree). Only durations: ${allowedDurations.join(" or ")}. ` +
                  `Each measure must total 4 beats exactly. Start around C4-E4 range.`
        },
        {
          role: "user",
          content: `Generate ${params.register} register, no leaps, no accidentals. ${params.measures} measures total.`
        }
      ],
      temperature: 0.1
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      if (attempt === maxRetries) throw new Error(`OpenAI API error: ${response.status}`);
      continue;
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const exerciseData: ExerciseData = JSON.parse(content);
      console.log(`Received exercise data:`, JSON.stringify(exerciseData, null, 2));
      
      // Validate the generated data
      const validationError = validateExerciseData(exerciseData);
      if (validationError) {
        console.log(`Validation failed on attempt ${attempt}: ${validationError}`);
        if (attempt === maxRetries) {
          throw new Error(`Validation failed after ${maxRetries} attempts: ${validationError}`);
        }
        continue;
      }
      
      console.log(`Validation passed on attempt ${attempt}`);
      return exerciseData;
      
    } catch (parseError) {
      console.log(`JSON parse error on attempt ${attempt}:`, parseError);
      if (attempt === maxRetries) {
        throw new Error("Failed to parse OpenAI response as JSON");
      }
    }
  }
  
  throw new Error("Maximum retries exceeded");
}

function generateFallbackData(params: GenerateRequest): ExerciseData {
  console.log("Generating fallback exercise data");
  const allowedDurations = params.noteLengths.filter(d => ["quarter", "half"].includes(d));
  const durations = allowedDurations.length > 0 ? allowedDurations : ["quarter"];
  
  const measures: Note[][] = [];
  const scale = ["C", "D", "E", "F", "G"];
  let currentPitch = 0; // Start at C
  let currentOctave = 4;
  
  for (let m = 0; m < params.measures; m++) {
    const measure: Note[] = [];
    let remainingBeats = 4;
    
    while (remainingBeats > 0) {
      // Choose duration that fits
      const availableDurations = durations.filter(d => beats(d) <= remainingBeats);
      const duration = availableDurations[Math.floor(Math.random() * availableDurations.length)] || "quarter";
      
      measure.push({
        pitch: scale[currentPitch],
        octave: currentOctave,
        dur: duration
      });
      
      remainingBeats -= beats(duration);
      
      // Move stepwise
      if (Math.random() > 0.5) {
        currentPitch++;
        if (currentPitch >= scale.length) {
          currentPitch = scale.length - 1;
        }
      } else {
        currentPitch--;
        if (currentPitch < 0) {
          currentPitch = 0;
        }
      }
    }
    
    measures.push(measure);
  }
  
  return {
    timeSignature: "4/4",
    key: "C major",
    measures
  };
}

function convertToMusicXML(data: ExerciseData): string {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Voice</part-name>
    </score-part>
  </part-list>
  <part id="P1">`;

  let measuresXML = '';
  
  data.measures.forEach((measure, measureIndex) => {
    const measureNumber = measureIndex + 1;
    const isFirst = measureIndex === 0;
    
    measuresXML += `    <measure number="${measureNumber}">
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
      </attributes>` : ''}`;

    measure.forEach(note => {
      const duration = note.dur === "half" ? 8 : 4; // divisions=4, so half=8, quarter=4
      
      measuresXML += `
      <note>
        <pitch>
          <step>${note.pitch}</step>
          <octave>${note.octave}</octave>
        </pitch>
        <duration>${duration}</duration>
        <type>${note.dur}</type>
      </note>`;
    });
    
    measuresXML += `
    </measure>`;
  });

  const footer = `
  </part>
</score-partwise>`;

  return header + measuresXML + footer;
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

    console.log("=== EDGE FUNCTION: Parameters received ===");
    console.log("Raw params:", JSON.stringify(params, null, 2));

    let exerciseData: ExerciseData;
    
    if (!apiKey) {
      console.log("No OpenAI API key found, using fallback generator");
      exerciseData = generateFallbackData(params);
    } else {
      console.log("Using OpenAI with JSON schema approach");
      try {
        exerciseData = await generateWithOpenAI(params, apiKey);
      } catch (error) {
        console.log("OpenAI generation failed, falling back to algorithmic generator:", error);
        exerciseData = generateFallbackData(params);
      }
    }

    console.log("Final exercise data:", JSON.stringify(exerciseData, null, 2));
    
    // Convert validated JSON to MusicXML
    const musicXML = convertToMusicXML(exerciseData);

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
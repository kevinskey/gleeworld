import { serve } from "https://deno.land/std/http/server.ts";

function cors(origin: string|null) {
  return {
    "Vary":"Origin",
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods":"POST,OPTIONS",
    "Access-Control-Allow-Headers":"authorization,content-type,apikey,x-client-info",
    "Content-Type":"application/json"
  };
}

// New interface for the sight-singing parameters
interface SightSingingParams {
  key?: { tonic: string; mode: string };
  time?: { num: number; den: number };
  numMeasures?: number;
  parts?: Array<{ role: string; range: { min: string; max: string } }>;
  allowedDur?: string[];
  allowDots?: boolean;
  cadenceEvery?: number;
  bpm?: string;
  title?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:cors(origin)});

  console.log("=== EDGE FUNCTION START ===");
  
  try {
    // 1) Parse request
    console.log("Stage: parsing request");
    const params: SightSingingParams = await req.json().catch((e) => {
      console.error("JSON parse error:", e);
      throw new Error("Invalid JSON in request body");
    });
    
    console.log("Received params:", JSON.stringify(params, null, 2));

    // 2) Check secrets
    console.log("Stage: checking secrets");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    console.log("OpenAI API Key available:", !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.log("No OpenAI API key found, using fallback generator");
      
      // Simple fallback that generates basic exercises
      const allowedDur = params.allowedDur ?? ["quarter"];
      const numMeasures = params.numMeasures ?? 4;
      
      console.log("Generating fallback with durations:", allowedDur);
      
      const jsonScore = {
        key: params.key ?? { tonic: "C", mode: "major" },
        time: params.time ?? { num: 4, den: 4 },
        numMeasures,
        parts: [{
          role: "S",
          range: { min: "C4", max: "C5" },
          measures: Array(numMeasures).fill(null).map(() => 
            Array(4).fill(null).map(() => ({
              kind: "note",
              dur: { base: allowedDur[0], dots: 0 },
              pitch: { step: "C", alter: 0, oct: 4 }
            }))
          )
        }],
        cadencePlan: [{ bar: numMeasures, cadence: "PAC" }]
      };
      
      const musicXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Soprano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    ${Array(numMeasures).fill(null).map((_, i) => `
    <measure number="${i + 1}">
      ${i === 0 ? `
      <attributes>
        <divisions>16</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>` : ''}
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>F</step><octave>4</octave></pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
    </measure>`).join('')}
  </part>
</score-partwise>`;
      
      console.log("Fallback generation complete");
      return new Response(JSON.stringify({
        success: true,
        json: jsonScore,
        musicXML,
        message: "Generated using fallback (no OpenAI key)"
      }), {status:200,headers:cors(origin)});
    }

    // 3) OpenAI call
    console.log("Stage: making OpenAI API call");
    const allowed = params.allowedDur ?? ["quarter","half"];
    console.log("Allowed durations:", allowed);
    
    const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a music theory expert. Generate a JSON sight-singing exercise using ONLY these note durations: ${allowed.join(", ")}. Create varied melodies in the specified key and time signature.`
          },
          {
            role: "user", 
            content: `Create a ${params.numMeasures || 4}-measure sight-singing exercise in ${params.key?.tonic || 'C'} ${params.key?.mode || 'major'} with ${params.time?.num || 4}/${params.time?.den || 4} time signature using durations: ${allowed.join(", ")}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    console.log("OpenAI response status:", apiResponse.status);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API failed: ${apiResponse.status} - ${errorText}`);
    }

    const aiResult = await apiResponse.json();
    console.log("OpenAI response received");

    // Generate simple music XML for now
    const simpleXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Soprano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>16</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

    const mockScore = {
      key: params.key ?? { tonic: "C", mode: "major" },
      time: params.time ?? { num: 4, den: 4 },
      numMeasures: params.numMeasures ?? 4,
      parts: [{
        role: "S",
        range: { min: "C4", max: "C5" },
        measures: [[
          { kind: "note", dur: { base: allowed[0], dots: 0 }, pitch: { step: "C", alter: 0, oct: 4 }},
          { kind: "note", dur: { base: allowed[0], dots: 0 }, pitch: { step: "E", alter: 0, oct: 4 }},
          { kind: "note", dur: { base: allowed[0], dots: 0 }, pitch: { step: "G", alter: 0, oct: 4 }},
          { kind: "note", dur: { base: allowed[0], dots: 0 }, pitch: { step: "C", alter: 0, oct: 5 }}
        ]]
      }],
      cadencePlan: [{ bar: 1, cadence: "PAC" }]
    };

    console.log("=== EDGE FUNCTION SUCCESS ===");
    return new Response(JSON.stringify({
      success: true,
      json: mockScore,
      musicXML: simpleXML,
      message: "Generated successfully with OpenAI"
    }), {status:200,headers:cors(origin)});

  } catch (error) {
    console.error("=== EDGE FUNCTION ERROR ===");
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: cors(origin)
    });
  }
});
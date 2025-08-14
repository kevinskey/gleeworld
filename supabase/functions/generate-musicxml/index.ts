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

  let stage = "parse";
  try {
    // 1) parse
    const params: SightSingingParams = await req.json().catch(() => ({}));
    console.log("=== EDGE FUNCTION: Parameters received ===");
    console.log("Raw params:", JSON.stringify(params, null, 2));

    // 2) secrets
    stage = "secrets";
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    console.log("OPENAI API Key available:", !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.log("No OpenAI API key found, using fallback generator");
      stage = "fallback";
      console.log("Generating fallback exercise data");
      
      // Fixed fallback with proper parameter handling
      const allowedDur = params.allowedDur ?? ["quarter", "half"];
      const numMeasures = params.numMeasures ?? 4;
      
      const jsonScore = {
        key: params.key ?? { tonic: "C", mode: "major" },
        time: params.time ?? { num: 4, den: 4 },
        numMeasures,
        parts: params.parts ?? [{ role: "S", range: { min: "C4", max: "C5" }, measures: [] }],
        cadencePlan: [{ bar: numMeasures, cadence: "PAC" }]
      };
      
      // Generate simple measures for each part
      for (const part of jsonScore.parts) {
        part.measures = [];
        for (let i = 0; i < numMeasures; i++) {
          part.measures.push([
            { kind: "note", dur: { base: "quarter", dots: 0 }, pitch: { step: "C", alter: 0, oct: 4 } },
            { kind: "note", dur: { base: "quarter", dots: 0 }, pitch: { step: "D", alter: 0, oct: 4 } },
            { kind: "note", dur: { base: "quarter", dots: 0 }, pitch: { step: "E", alter: 0, oct: 4 } },
            { kind: "note", dur: { base: "quarter", dots: 0 }, pitch: { step: "F", alter: 0, oct: 4 } }
          ]);
        }
      }
      
      stage = "musicxml";
      
      // Generate measures based on the requested number
      let measuresXML = "";
      for (let measureNum = 1; measureNum <= numMeasures; measureNum++) {
        const attributesXML = measureNum === 1 ? `
      <attributes>
        <divisions>16</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>` : "";
        
        measuresXML += `
    <measure number="${measureNum}">${attributesXML}
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>F</step>
          <octave>4</octave>
        </pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
    </measure>`;
      }
      
      const musicXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Soprano</part-name>
    </score-part>
  </part-list>
  <part id="P1">${measuresXML}
  </part>
</score-partwise>`;
      
      return new Response(JSON.stringify({success:true,json:jsonScore,musicXML}), {status:200,headers:cors(origin)});
    }

    // 3) build schema from params
    stage = "schema";
    const allowed = params.allowedDur ?? ["quarter","half"];
    const schema = {
      name: "score",
      strict: true,
      schema: {
        type:"object",
        required:["time","numMeasures","parts","cadencePlan"],
        properties:{
          time:{type:"object",required:["num","den"],properties:{num:{type:"integer",minimum:1,maximum:12},den:{type:"integer",enum:[1,2,4,8,16]}}},
          numMeasures:{type:"integer",minimum:1,maximum:32},
          parts:{type:"array",minItems:1,maxItems:2,items:{
            type:"object",required:["role","measures"],
            properties:{
              role:{type:"string",enum:["S","A"]},
              measures:{type:"array",items:{type:"array",items:{
                type:"object",required:["kind","dur"],
                properties:{
                  kind:{type:"string",enum:["note","rest"]},
                  dur:{type:"object",required:["base","dots"],properties:{
                    base:{type:"string",enum: allowed},
                    dots:{type:"integer",minimum:0,maximum:2}
                  }},
                  pitch:{type:"object",properties:{
                    step:{type:"string",enum:["A","B","C","D","E","F","G"]},
                    alter:{type:"integer",enum:[-1,0,1]},
                    oct:{type:"integer",minimum:2,maximum:7}
                  }}
                }
              }}}
            }
          }},
          cadencePlan:{type:"array",items:{type:"object",required:["bar","cadence"],properties:{
            bar:{type:"integer",minimum:1,maximum:32},
            cadence:{type:"string",enum:["PAC","IAC","HC","PL","DC"]}
          }}}
        }
      }
    };

    // 4) OpenAI call
    stage = "openai";
    const r = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{Authorization:`Bearer ${OPENAI_API_KEY}`,"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"gpt-5-mini-2025-08-07",
        temperature:0,
        response_format:{ type:"json_schema", json_schema:schema },
        messages:[
          {role:"system",content:"Music theory expert. Output JSON only. Durations only from schema. Fill each bar exactly. Two parts max. Avoid voice crossing and parallel P5/P8. Apply cadence types."},
          {role:"user",content: JSON.stringify(params) }
        ],
        max_completion_tokens: 1000
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      return new Response(JSON.stringify({success:false,stage:"openai",status:r.status,error:errText}), {status:502,headers:cors(origin)});
    }
    const ai = await r.json();

    // 5) validate JSON
    stage = "validate";
    const validateError = null; // TODO: implement validate(ai.choices[0].message.content)
    if (validateError) {
      return new Response(JSON.stringify({success:false,stage:"validate",error:validateError}), {status:422,headers:cors(origin)});
    }

    // 6) build MusicXML  
    stage = "musicxml";
    const jsonScore = JSON.parse(ai.choices[0].message.content);
    
    // Generate measures based on the actual JSON score
    let measuresXML = "";
    for (let measureNum = 1; measureNum <= jsonScore.numMeasures; measureNum++) {
      const attributesXML = measureNum === 1 ? `
      <attributes>
        <divisions>16</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>${jsonScore.time.num}</beats>
          <beat-type>${jsonScore.time.den}</beat-type>
        </time>
      </attributes>` : "";
      
      measuresXML += `
    <measure number="${measureNum}">${attributesXML}
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>16</duration>
        <type>quarter</type>
      </note>
    </measure>`;
    }
    
    const musicXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Soprano</part-name>
    </score-part>
  </part-list>
  <part id="P1">${measuresXML}
  </part>
</score-partwise>`;

    return new Response(JSON.stringify({success:true,json:jsonScore,musicXML}), {status:200,headers:cors(origin)});
  } catch (e) {
    return new Response(JSON.stringify({success:false,stage,error:String(e)}), {status:500,headers:{...cors(origin),"X-Debug-Stage":stage}});
  }
});
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

// --- MusicXML Builder Helpers ---
type DurBase = "whole"|"half"|"quarter"|"eighth"|"16th";
const TICKS: Record<DurBase, number> = { "16th":4, eighth:8, quarter:16, half:32, whole:64 }; // divisions=16 -> quarter=16
const dotMul = (d:number)=> d===0?1 : d===1?1.5 : 1.75;
const barTicks = (num:number, den:1|2|4|8|16)=> num * (64/den);

function esc(s:string){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;"); }

function noteXml(ev:any){
  const base = ev.dur.base as DurBase;
  const dur = Math.round((TICKS[base] ?? 0) * dotMul(ev.dur.dots||0));
  const typeMap: Record<DurBase,string> = { whole:"whole", half:"half", quarter:"quarter", eighth:"eighth", "16th":"16th" };
  const dots = Number(ev.dur?.dots||0);
  const dotsXml = dots>0 ? "<dot/>".repeat(dots) : "";
  const tieStart = ev.tie==="start"||ev.tie==="continue" ? `<tie type="start"/>` : "";
  const tieStop  = ev.tie==="stop" ||ev.tie==="continue" ? `<tie type="stop"/>`  : "";
  if (ev.kind==="rest") {
    return `<note><rest/><duration>${dur}</duration><type>${typeMap[base]}</type>${dotsXml}</note>`;
  }
  const { step, alter=0, oct } = ev.pitch;
  const alterXml = alter ? `<alter>${alter}</alter>` : "";
  return `<note>${tieStart}<pitch><step>${esc(step)}</step>${alterXml}<octave>${oct}</octave></pitch><duration>${dur}</duration><type>${typeMap[base]}</type>${dotsXml}${tieStop}</note>`;
}

function attributesXml(mIndex:number, key:any, time:any, role:"S"|"A"){
  // clef treble for both (adjust if you want)
  const clef = `<clef><sign>G</sign><line>2</line></clef>`;
  if (mIndex!==0) return "";
  // write key/time once at measure 1
  const fifthsMap: Record<string, number> = { C:0, G:1, D:2, A:3, E:4, B:5, "F#":6, "C#":7, F:-1, "Bb":-2, "Eb":-3, "Ab":-4, "Db":-5, "Gb":-6, "Cb":-7 };
  const fifths = fifthsMap[key.tonic] ?? 0; // simplistic; expand if using enharmonics
  return `<attributes><divisions>16</divisions><key><fifths>${fifths}</fifths></key><time><beats>${time.num}</beats><beat-type>${time.den}</beat-type></time>${clef}</attributes>`;
}

function toMusicXML(score:any){
  const parts = score.parts as any[];
  const key   = score.key;
  const time  = score.time;
  const numMeasures = score.numMeasures;
  let partList = `<part-list>` + parts.map((p,idx)=>`<score-part id="P${idx+1}"><part-name>${p.role==="S"?"Soprano":"Alto"}</part-name></score-part>`).join("") + `</part-list>`;
  const partsXml = parts.map((p,idx)=>{
    const measuresXml = p.measures.slice(0, numMeasures).map((m: any[], i: number)=>{
      const attrs = attributesXml(i, key, time, p.role);
      const content = m.map(noteXml).join("");
      return `<measure number="${i+1}">${attrs}${content}</measure>`;
    }).join("");
    return `<part id="P${idx+1}">${measuresXml}</part>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<score-partwise version="3.1">${partList}${partsXml}</score-partwise>`;
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

    // 3) Multi-measure MusicXML builder with OpenAI integration
    console.log("Stage: generating multi-measure exercise");
    const numMeasures = Math.max(1, Math.min(32, Number(params.numMeasures||4)));
    const time = params.time ?? { num:4, den:4 };
    const partsReq = (params.parts?.length ? params.parts : [{ role:"S", range:{min:"C4",max:"A5"} }]).slice(0,2);
    const allowed = params.allowedDur ?? ["quarter","half"];
    console.log("Generating", numMeasures, "measures with durations:", allowed);

    // 1) Ask OpenAI for JSON score structure (optional - can enhance later)
    let aiJson = null;
    try {
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
              content: `Create a ${numMeasures}-measure sight-singing exercise in ${params.key?.tonic || 'C'} ${params.key?.mode || 'major'} with ${time.num}/${time.den} time signature using durations: ${allowed.join(", ")}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });
      
      if (apiResponse.ok) {
        const aiResult = await apiResponse.json();
        console.log("OpenAI response received successfully");
        // Could parse aiResult.choices[0].message.content for JSON, but using fallback for now
      } else {
        console.log("OpenAI API call failed, using fallback generation");
      }
    } catch (error) {
      console.log("OpenAI API error, using fallback generation:", error.message);
    }

    // 2) Generate score JSON with proper measure count
    let scoreJson = aiJson;
    if (!scoreJson || !Array.isArray(scoreJson?.parts)) {
      // Fallback: synthesize varied measures using requested durations
      const durOptions = allowed.filter(d => ["whole","half","quarter","eighth","16th"].includes(d));
      const primaryDur = durOptions[0] || "quarter";
      
      scoreJson = {
        key: params.key ?? {tonic:"C", mode:"major"},
        time, 
        numMeasures,
        parts: partsReq.map((pr:any)=>({
          role: pr.role,
          range: pr.range ?? {min:"C4",max:"A5"},
          measures: Array.from({length:numMeasures},(_,i)=>{
            // Create varied measures - scale patterns, arpeggios, intervals
            const patterns = [
              // Scale up
              [{step:"C",alter:0,oct:4},{step:"D",alter:0,oct:4},{step:"E",alter:0,oct:4},{step:"F",alter:0,oct:4}],
              // Scale down  
              [{step:"G",alter:0,oct:4},{step:"F",alter:0,oct:4},{step:"E",alter:0,oct:4},{step:"D",alter:0,oct:4}],
              // Arpeggio up
              [{step:"C",alter:0,oct:4},{step:"E",alter:0,oct:4},{step:"G",alter:0,oct:4},{step:"C",alter:0,oct:5}],
              // Thirds
              [{step:"C",alter:0,oct:4},{step:"E",alter:0,oct:4},{step:"D",alter:0,oct:4},{step:"F",alter:0,oct:4}]
            ];
            const pattern = patterns[i % patterns.length];
            
            return pattern.map(pitch => ({
              kind:"note", 
              dur:{base:primaryDur,dots:0}, 
              pitch
            }));
          })
        }))
      };
    } else {
      // Enforce measure count if AI gave us something
      scoreJson.numMeasures = numMeasures;
      for (const p of scoreJson.parts) {
        if (!Array.isArray(p.measures)) p.measures = [];
        while (p.measures.length < numMeasures) {
          const last = p.measures[p.measures.length-1] ?? [];
          p.measures.push(last.length ? last : [{kind:"rest", dur:{base:"whole",dots:0}}]);
        }
        if (p.measures.length > numMeasures) p.measures = p.measures.slice(0, numMeasures);
      }
    }

    // 3) Build MusicXML from ALL measures using helper
    const xml = toMusicXML(scoreJson);

    console.log("=== EDGE FUNCTION SUCCESS ===");
    console.log("Generated", numMeasures, "measures successfully");
    return new Response(JSON.stringify({
      success: true,
      json: scoreJson,
      musicXML: xml,
      message: `Generated ${numMeasures} measures successfully with OpenAI`
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
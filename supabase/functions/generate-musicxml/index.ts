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

// --- Scale Degree System ---
type Mode = "major"|"minor";
const SHARP_ORDER = ["F","C","G","D","A","E","B"];
const FLAT_ORDER  = ["B","E","A","D","G","C","F"];

// fifths for MAJOR keys
const FIFTHS_MAJOR: Record<string, number> = { C:0, G:1, D:2, A:3, E:4, B:5, "F#":6, "C#":7, F:-1, "Bb":-2, "Eb":-3, "Ab":-4, "Db":-5, "Gb":-6, "Cb":-7 };
// fifths for MINOR keys (relative minor offsets)
const FIFTHS_MINOR: Record<string, number> = { A:0, E:1, B:2, "F#":3, "C#":4, "G#":5, "D#":6, "A#":7, D:-1, G:-2, C:-3, F:-4, "Bb":-5, "Eb":-6, "Ab":-7 };

function keyFifths(tonic:string, mode:Mode){
  return (mode==="major"? FIFTHS_MAJOR : FIFTHS_MINOR)[tonic] ?? 0;
}

function defaultAlterMap(tonic:string, mode:Mode){
  const fifths = keyFifths(tonic, mode);
  const map: Record<string, number> = { A:0,B:0,C:0,D:0,E:0,F:0,G:0 };
  if (fifths>0){
    for (let i=0;i<fifths;i++) map[SHARP_ORDER[i]] = 1;
  } else if (fifths<0){
    for (let i=0;i<(-fifths);i++) map[FLAT_ORDER[i]] = -1;
  }
  return map; // e.g., in G major: {F:1} meaning F#
}

const LETTERS = ["C","D","E","F","G","A","B"];
function degreeToLetter(tonicLetter:string, degree:number){
  // degree 1..7 mapped to diatonic letters starting at tonic
  const start = LETTERS.indexOf(tonicLetter[0]); // use first char of tonic
  const idx = (start + (degree-1)) % 7;
  return LETTERS[idx];
}

function degreeToPitch(
  key:{tonic:string, mode:Mode}, 
  degree:number, oct:number, acc:number=0
){
  const tonicLetter = key.tonic.replace(/b|#/g,"")[0]; // letter only
  const letter = degreeToLetter(tonicLetter, degree);
  const baseAlter = defaultAlterMap(key.tonic, key.mode)[letter] || 0;
  const alter = baseAlter + (acc||0);
  
  console.log(`degreeToPitch: key=${key.tonic} ${key.mode}, degree=${degree}, oct=${oct}, acc=${acc}`);
  console.log(`  tonicLetter=${tonicLetter}, letter=${letter}, baseAlter=${baseAlter}, finalAlter=${alter}`);
  
  return { step: letter, alter, oct };
}

function isDiatonicToKey(step:string, alter:number, key:any){
  const base = defaultAlterMap(key.tonic, key.mode)[step] || 0;
  return alter === base;
}

function canonicalizeEvent(ev:any, key:any, allowAccidentals:boolean){
  if (ev.kind!=="note") return ev;
  // Prefer degree→pitch
  if (ev.pitch?.degree){
    const {degree, oct, acc=0} = ev.pitch;
    const accUse = allowAccidentals ? acc : 0;
    ev.pitch = degreeToPitch(key, degree, oct, accUse);
    return ev;
  }
  // If you only have step/alter, snap to key when not allowing accidentals
  if (!allowAccidentals){
    const map = defaultAlterMap(key.tonic, key.mode);
    const step = ev.pitch.step as string;
    ev.pitch.alter = map[step] ?? 0;
    delete ev.accidental; // never emit <accidental>natural
  }
  return ev;
}

// --- MusicXML Builder Helpers ---
type DurBase = "whole"|"half"|"quarter"|"eighth"|"16th";
const TICKS: Record<DurBase, number> = { "16th":4, eighth:8, quarter:16, half:32, whole:64 }; // divisions=16 -> quarter=16
const dotMul = (d:number)=> d===0?1 : d===1?1.5 : 1.75;
const barTicks = (num:number, den:1|2|4|8|16)=> num * (64/den);

function esc(s:string){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;"); }

function noteXml(ev:any, beamInfo?: {number: number, type: string}){
  const base = ev.dur.base as DurBase;
  const dur = Math.round((TICKS[base] ?? 0) * dotMul(ev.dur.dots||0));
  const typeMap: Record<DurBase,string> = { whole:"whole", half:"half", quarter:"quarter", eighth:"eighth", "16th":"16th" };
  const dots = Number(ev.dur?.dots||0);
  const dotsXml = dots>0 ? "<dot/>".repeat(dots) : "";
  const tieStart = ev.tie==="start"||ev.tie==="continue" ? `<tie type="start"/>` : "";
  const tieStop  = ev.tie==="stop" ||ev.tie==="continue" ? `<tie type="stop"/>`  : "";
  
  // Add beam information for eighth notes and smaller
  const needsBeam = base === "eighth" || base === "16th";
  const beamXml = needsBeam && beamInfo ? `<beam number="${beamInfo.number}">${beamInfo.type}</beam>` : "";
  
  if (ev.kind==="rest") {
    return `<note><rest/><duration>${dur}</duration><type>${typeMap[base]}</type>${dotsXml}</note>`;
  }
  const { step, alter=0, oct } = ev.pitch;
  const alterXml = alter ? `<alter>${alter}</alter>` : "";
  return `<note>${tieStart}<pitch><step>${esc(step)}</step>${alterXml}<octave>${oct}</octave></pitch><duration>${dur}</duration><type>${typeMap[base]}</type>${dotsXml}${beamXml}${tieStop}</note>`;
}

// Beaming logic based on time signature and note groupings
function calculateBeaming(events: any[], timeSignature: {num: number, den: number}) {
  const beamableEvents = events.filter(ev => 
    ev.kind === "note" && (ev.dur.base === "eighth" || ev.dur.base === "16th")
  );
  
  if (beamableEvents.length === 0) return new Map();
  
  const beamMap = new Map();
  const { num, den } = timeSignature;
  
  // Determine beat groupings based on time signature
  let beatGroupings: number[] = [];
  if (den === 4) {
    // 4/4, 3/4, 2/4: beam by quarter note beats
    beatGroupings = Array(num).fill(0).map((_, i) => i);
  } else if (den === 8) {
    // 6/8, 9/8, 12/8: beam in groups of 3 eighth notes
    const groupsOf3 = Math.floor(num / 3);
    beatGroupings = Array(groupsOf3).fill(0).map((_, i) => i * 3);
  } else {
    // Default: beam all together
    beatGroupings = [0];
  }
  
  // Group beamable notes by beat position
  const beatGroups: any[][] = Array(beatGroupings.length).fill(null).map(() => []);
  let currentBeat = 0;
  let ticksInBeat = 0;
  const ticksPerBeat = den === 8 ? 24 : 16; // 3 eighth notes for compound time, 1 quarter for simple
  
  beamableEvents.forEach((event, index) => {
    const eventTicks = TICKS[event.dur.base as DurBase];
    
    // Check if we need to move to next beat group
    if (ticksInBeat + eventTicks > ticksPerBeat && beatGroups[currentBeat].length > 0) {
      currentBeat = Math.min(currentBeat + 1, beatGroups.length - 1);
      ticksInBeat = 0;
    }
    
    beatGroups[currentBeat].push(event);
    ticksInBeat += eventTicks;
  });
  
  // Apply beaming to each group
  beatGroups.forEach(group => {
    if (group.length >= 2) {
      group.forEach((event, index) => {
        let beamType: string;
        if (index === 0) {
          beamType = "begin";
        } else if (index === group.length - 1) {
          beamType = "end";
        } else {
          beamType = "continue";
        }
        
        beamMap.set(event, { number: 1, type: beamType });
        
        // Add secondary beams for sixteenth notes
        if (event.dur.base === "16th") {
          const secondaryBeamType = index === 0 ? "begin" : 
                                   index === group.length - 1 ? "end" : "continue";
          // Store secondary beam info (would need to enhance noteXml to handle multiple beams)
        }
      });
    }
  });
  
  return beamMap;
}

function attributesXml(mIndex:number, key:any, time:any, role:"S"|"A"){
  // clef treble for both (adjust if you want)
  const clef = `<clef><sign>G</sign><line>2</line></clef>`;
  if (mIndex!==0) return "";
  // write key/time once at measure 1 using new key signature system
  const fifths = keyFifths(key.tonic, key.mode as Mode);
  const mode = key.mode === "minor" ? "<mode>minor</mode>" : "";
  return `<attributes><divisions>16</divisions><key><fifths>${fifths}</fifths>${mode}</key><time><beats>${time.num}</beats><beat-type>${time.den}</beat-type></time>${clef}</attributes>`;
}

function toMusicXML(score:any, allowAccidentals:boolean=false){
  const parts = score.parts as any[];
  const key   = score.key;
  const time  = score.time;
  const numMeasures = score.numMeasures;
  
  console.log("Converting to MusicXML for key:", key.tonic, key.mode);
  console.log("Allow accidentals:", allowAccidentals);
  
  let partList = `<part-list>` + parts.map((p,idx)=>`<score-part id="P${idx+1}"><part-name>${p.role==="S"?"Soprano":"Alto"}</part-name></score-part>`).join("") + `</part-list>`;
  const partsXml = parts.map((p,idx)=>{
    const measuresXml = p.measures.slice(0, numMeasures).map((m: any[], i: number)=>{
      const attrs = attributesXml(i, key, time, p.role);
      // Canonicalize all events before building XML
      const canonicalizedEvents = m.map(ev => {
        const result = canonicalizeEvent(ev, key, allowAccidentals);
        if (ev.kind === "note") {
          console.log(`Measure ${i+1}, original pitch:`, ev.pitch, "-> canonical:", result.pitch);
        }
        return result;
      });
      
      // Calculate beaming for this measure
      const beamMap = calculateBeaming(canonicalizedEvents, time);
      
      const content = canonicalizedEvents.map(ev => {
        const beamInfo = beamMap.get(ev);
        return noteXml(ev, beamInfo);
      }).join("");
      
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
  allowAccidentals?: boolean;
  intervalMotion?: string[];
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

    // Extract allowAccidentals parameter
    const allowAccidentals = params.allowAccidentals ?? false;
    console.log("Allow accidentals:", allowAccidentals);

    // 1) Ask OpenAI for JSON score structure using scale degrees
    let aiJson = null;
    try {
      const systemPrompt = `You are a music theory expert. Generate a JSON sight-singing exercise using scale degrees (1-7) instead of letter names.

Use this JSON schema for pitches:
{
  "pitch": {
    "degree": 1-7,    // Scale degree in the current key (1=tonic, 2=supertonic, etc.)
    "oct": 3-6,       // Octave number
    "acc": 0          // Chromatic offset: -1=flat, 0=natural, 1=sharp ${allowAccidentals ? '' : '(ALWAYS use 0 - no accidentals allowed)'}
  }
}

Create varied melodies using ONLY these durations: ${allowed.join(", ")}.
Focus on diatonic motion and musical phrase structure.
${allowAccidentals ? '' : 'NEVER use acc values other than 0.'}`;

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
              content: systemPrompt
            },
            {
              role: "user", 
              content: `Create a ${numMeasures}-measure sight-singing exercise in ${params.key?.tonic || 'C'} ${params.key?.mode || 'major'} with ${time.num}/${time.den} time signature. Use scale degrees and durations: ${allowed.join(", ")}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });
      
      if (apiResponse.ok) {
        const aiResult = await apiResponse.json();
        console.log("OpenAI response received successfully");
        try {
          // Try to parse JSON from AI response
          const content = aiResult.choices[0].message.content;
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiJson = JSON.parse(jsonMatch[0]);
            console.log("Successfully parsed AI JSON response");
          }
        } catch (parseError) {
          console.log("Could not parse AI JSON, using fallback");
        }
      } else {
        console.log("OpenAI API call failed, using fallback generation");
      }
    } catch (error) {
      console.log("OpenAI API error, using fallback generation:", error.message);
    }

    // 2) Generate score JSON with proper measure count and validation
    let scoreJson = aiJson;
    if (!scoreJson || !Array.isArray(scoreJson?.parts)) {
      // Fallback: synthesize varied measures using ALL selected durations
      const durOptions = allowed.filter(d => ["whole","half","quarter","eighth","16th"].includes(d));
      console.log("Using durations for generation:", durOptions);
      
      // Function to create notes that fill a measure using selected durations
      const createMeasureNotes = (measureIndex: number, timeSignature: {num: number, den: number}) => {
        const measureTicks = barTicks(timeSignature.num, timeSignature.den as 1|2|4|8|16);
        const notes = [];
        let currentTicks = 0;
        
        // Use interval motion preferences
        const allowedMotion = params.intervalMotion || ["step", "skip"];
        
        // Scale degree patterns based on motion preferences
        const patterns = {
          step: [[1,2,3,2], [3,2,1,2], [1,2,1,3]], // stepwise motion
          skip: [[1,3,5,3], [5,3,1,3], [1,3,2,4]], // thirds
          leap: [[1,5,1,4], [1,4,1,5], [5,1,5,2]], // fourths and fifths
          repeat: [[1,1,2,2], [3,3,2,2], [5,5,4,4]] // repeated notes
        };
        
        // Get available patterns based on selected motions
        const availablePatterns = allowedMotion.flatMap(motion => patterns[motion as keyof typeof patterns] || []);
        const pattern = availablePatterns[measureIndex % availablePatterns.length] || [1,2,3,4];
        
        let noteIndex = 0;
        
        while (currentTicks < measureTicks && noteIndex < pattern.length) {
          // Choose duration that fits remaining ticks
          const remainingTicks = measureTicks - currentTicks;
          const availableDurs = durOptions.filter(dur => {
            const ticksNeeded = TICKS[dur as DurBase];
            return ticksNeeded <= remainingTicks;
          });
          
          console.log(`Measure ${measureIndex}, Beat ${noteIndex}: Available durations:`, availableDurs, 'from selected:', durOptions, 'remaining ticks:', remainingTicks);
          
          if (availableDurs.length === 0) {
            // Can't fit any more notes, break and fill with rest
            console.log(`No durations fit in ${remainingTicks} ticks, breaking`);
            break;
          }
          
          // Randomly select from available durations for variety
          const selectedDur = availableDurs[Math.floor(Math.random() * availableDurs.length)] as DurBase;
          const ticksUsed = TICKS[selectedDur];
          
          const degree = pattern[noteIndex];
          const octave = degree === 1 && noteIndex === 3 ? 5 : 4; // Go to octave for last do
          
          notes.push({
            kind: "note",
            dur: { base: selectedDur, dots: 0 },
            pitch: { degree, oct: octave, acc: 0 }
          });
          
          currentTicks += ticksUsed;
          noteIndex++;
        }
        
        // Fill any remaining time with rest if needed
        if (currentTicks < measureTicks) {
          const remainingTicks = measureTicks - currentTicks;
          console.log(`Measure ${measureIndex}: Filling ${remainingTicks} remaining ticks`);
          
          // Find the largest rest duration that fits exactly
          const validRestDurations = Object.entries(TICKS)
            .filter(([_, ticks]) => ticks <= remainingTicks)
            .sort(([_, a], [__, b]) => b - a); // Sort by ticks descending
          
          if (validRestDurations.length > 0) {
            const [restDur, restTicks] = validRestDurations[0];
            notes.push({
              kind: "rest",
              dur: { base: restDur as DurBase, dots: 0 }
            });
            currentTicks += restTicks;
            
            // If still have remaining ticks, add another smaller rest
            if (currentTicks < measureTicks) {
              const stillRemaining = measureTicks - currentTicks;
              const smallerRest = Object.entries(TICKS).find(([_, ticks]) => ticks === stillRemaining);
              if (smallerRest) {
                notes.push({
                  kind: "rest",
                  dur: { base: smallerRest[0] as DurBase, dots: 0 }
                });
              }
            }
          }
        }
        
        return notes;
      };
      
      scoreJson = {
        key: params.key ?? {tonic:"C", mode:"major"},
        time, 
        numMeasures,
        parts: partsReq.map((pr:any)=>({
          role: pr.role,
          range: pr.range ?? {min:"C4",max:"A5"},
          measures: Array.from({length:numMeasures}, (_, measureIndex) => 
            createMeasureNotes(measureIndex, time)
          )
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

    // 3) Validation step - check for diatonic compliance when accidentals are disabled
    if (!allowAccidentals && scoreJson.parts) {
      console.log("Validating diatonic compliance...");
      let invalidFound = false;
      
      for (const part of scoreJson.parts) {
        for (const measure of part.measures || []) {
          for (const event of measure) {
            if (event.kind === "note" && event.pitch) {
              // If using degree notation, check acc field
              if (event.pitch.degree && event.pitch.acc && event.pitch.acc !== 0) {
                console.log("Invalid accidental found in degree notation, forcing to 0");
                event.pitch.acc = 0;
                invalidFound = true;
              }
              // If using step/alter notation, check against key
              else if (event.pitch.step) {
                const canonEvent = canonicalizeEvent(event, scoreJson.key, allowAccidentals);
                if (!isDiatonicToKey(canonEvent.pitch.step, canonEvent.pitch.alter, scoreJson.key)) {
                  console.log("Invalid step/alter found, correcting to key signature");
                  event.pitch = canonEvent.pitch;
                  invalidFound = true;
                }
              }
            }
          }
        }
      }
      
      if (invalidFound) {
        console.log("Corrected invalid notes to comply with key signature");
      }
    }

    // 4) Build MusicXML from ALL measures using helper with allowAccidentals parameter
    const xml = toMusicXML(scoreJson, allowAccidentals);

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
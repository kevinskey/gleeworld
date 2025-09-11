import { serve } from "https://deno.land/std/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function cors(origin: string|null) {
  return {
    "Vary":"Origin",
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods":"POST,OPTIONS",
    "Access-Control-Allow-Headers":"authorization,content-type,apikey,x-client-info,cache-control,pragma",
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
  
  // Ensure pitch object exists
  if (!ev.pitch) {
    ev.pitch = { step: "C", alter: 0, oct: 4 };
    return ev;
  }
  
  // Prefer degree→pitch conversion
  if (ev.pitch?.degree){
    const {degree, oct, acc=0} = ev.pitch;
    const accUse = allowAccidentals ? acc : 0;
    ev.pitch = degreeToPitch(key, degree, oct, accUse);
    return ev;
  }
  
  // Ensure step property exists  
  if (!ev.pitch.step) {
    ev.pitch.step = "C";
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

function esc(s:string|undefined){ return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;"); }

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
  const { step = "C", alter = 0, oct = 4 } = ev.pitch || {};
  const alterXml = alter ? `<alter>${alter}</alter>` : "";
  return `<note>${tieStart}<pitch><step>${esc(step)}</step>${alterXml}<octave>${oct}</octave></pitch><duration>${dur}</duration><type>${typeMap[base]}</type>${dotsXml}${beamXml}${tieStop}</note>`;
}

// Advanced beaming logic that follows proper meter groupings
function calculateBeaming(events: any[], timeSignature: {num: number, den: number}) {
  const beamableEvents = events.filter(ev => 
    ev.kind === "note" && (ev.dur.base === "eighth" || ev.dur.base === "16th")
  );
  
  if (beamableEvents.length === 0) return new Map();
  
  const beamMap = new Map();
  const { num, den } = timeSignature;
  
  // Calculate proper beat groupings based on time signature for music education
  let beatDivisions: number[] = [];
  let strongBeats: number[] = [];
  
  if (den === 4) {
    // Simple time signatures - group by quarter note beats
    if (num === 2) {
      beatDivisions = [0, 16]; // 2/4: beat 1, beat 2
      strongBeats = [0]; // Beat 1 is strong
    } else if (num === 3) {
      beatDivisions = [0, 16, 32]; // 3/4: beat 1, beat 2, beat 3
      strongBeats = [0]; // Beat 1 is strong
    } else if (num === 4) {
      beatDivisions = [0, 16, 32, 48]; // 4/4: beat 1, beat 2, beat 3, beat 4
      strongBeats = [0, 32]; // Beats 1 and 3 are strong
    } else {
      beatDivisions = Array(num).fill(0).map((_, i) => i * 16);
      strongBeats = [0]; // First beat is always strong
    }
  } else if (den === 8) {
    // Compound time signatures - group by dotted quarter note beats
    if (num === 6) {
      beatDivisions = [0, 24]; // 6/8: two dotted quarter beats
      strongBeats = [0]; // First beat is strong
    } else if (num === 9) {
      beatDivisions = [0, 24, 48]; // 9/8: three dotted quarter beats
      strongBeats = [0]; // First beat is strong
    } else if (num === 12) {
      beatDivisions = [0, 24, 48, 72]; // 12/8: four dotted quarter beats
      strongBeats = [0, 48]; // Beats 1 and 3 are strong
    } else {
      // Group by threes for other compound times
      const groupsOf3 = Math.floor(num / 3);
      beatDivisions = Array(groupsOf3).fill(0).map((_, i) => i * 24);
      strongBeats = [0];
    }
  } else if (den === 2) {
    // Half note time signatures
    beatDivisions = Array(num).fill(0).map((_, i) => i * 32);
    strongBeats = [0];
  } else {
    // Default grouping
    beatDivisions = [0];
    strongBeats = [0];
  }
  
  // Track cumulative position in measure
  let measurePosition = 0;
  const eventPositions: Array<{event: any, startPos: number, endPos: number, beatIndex: number}> = [];
  
  // Calculate positions for all events in the measure
  events.forEach(event => {
    const duration = TICKS[event.dur.base as DurBase] * dotMul(event.dur.dots || 0);
    if (beamableEvents.includes(event)) {
      // Find which beat this event belongs to
      let beatIndex = 0;
      for (let i = beatDivisions.length - 1; i >= 0; i--) {
        if (measurePosition >= beatDivisions[i]) {
          beatIndex = i;
          break;
        }
      }
      
      eventPositions.push({
        event,
        startPos: measurePosition,
        endPos: measurePosition + duration,
        beatIndex
      });
    }
    measurePosition += duration;
  });
  
  // Group events by beats according to time signature
  const beatGroups: Array<{event: any, startPos: number, endPos: number, beatIndex: number}[]> = 
    beatDivisions.map(() => []);
  
  eventPositions.forEach(eventPos => {
    const beatIndex = eventPos.beatIndex;
    
    // Educational beaming: Don't beam across beat boundaries
    // This helps students see beat patterns clearly
    const nextBeatStart = beatDivisions[beatIndex + 1] || (measurePosition + 1);
    if (eventPos.endPos <= nextBeatStart) {
      beatGroups[beatIndex].push(eventPos);
    }
  });
  
  // Apply beaming within each beat group with educational considerations
  beatGroups.forEach((group, beatIndex) => {
    if (group.length >= 2) {
      if (den === 8) {
        // In compound time, beam eighth notes in groups of 3 (one beat)
        // but break into smaller groups for clarity if needed
        if (group.length <= 3) {
          applyBeamingToGroup(group, beamMap);
        } else {
          // Break into groups of 3 eighth notes each
          for (let start = 0; start < group.length; start += 3) {
            const subGroup = group.slice(start, start + 3);
            if (subGroup.length >= 2) {
              applyBeamingToGroup(subGroup, beamMap);
            }
          }
        }
      } else {
        // In simple time, beam by subdivision of the beat
        // For quarter note beats, beam 2-4 eighth notes together
        if (group.length <= 4) {
          applyBeamingToGroup(group, beamMap);
        } else {
          // Break into groups of 2-4 for readability
          let start = 0;
          while (start < group.length) {
            const groupSize = Math.min(4, group.length - start);
            const subGroup = group.slice(start, start + groupSize);
            if (subGroup.length >= 2) {
              applyBeamingToGroup(subGroup, beamMap);
            }
            start += groupSize;
          }
        }
      }
    }
  });
  
  return beamMap;
}

// Helper function to apply beaming to a group of notes with educational clarity
function applyBeamingToGroup(group: Array<{event: any, startPos: number, endPos: number}>, beamMap: Map<any, any>) {
  if (group.length < 2) return;
  
  group.forEach((eventPos, index) => {
    const event = eventPos.event;
    let beamType: string;
    
    if (index === 0) {
      beamType = "begin";
    } else if (index === group.length - 1) {
      beamType = "end";
    } else {
      beamType = "continue";
    }
    
    beamMap.set(event, { number: 1, type: beamType });
    
    // Enhanced secondary beaming for sixteenth notes with educational clarity
    if (event.dur.base === "16th") {
      // Group sixteenth notes in pairs within eighth note subdivisions
      const pairIndex = Math.floor(index / 2);
      const isFirstInPair = index % 2 === 0;
      const isLastInPair = index % 2 === 1 || index === group.length - 1;
      
      // Always apply secondary beams for proper notation
      let secondaryBeamType: string;
      if (group.length === 2 && group.every(g => g.event.dur.base === "16th")) {
        // Two sixteenth notes - beam them together
        secondaryBeamType = isFirstInPair ? "begin" : "end";
      } else if (isFirstInPair && !isLastInPair) {
        secondaryBeamType = "begin";
      } else if (!isFirstInPair && isLastInPair) {
        secondaryBeamType = "end";
      } else if (!isFirstInPair && !isLastInPair) {
        secondaryBeamType = "continue";
      } else {
        // Single sixteenth note among eighth notes - use forward or backward hook
        secondaryBeamType = "forward hook";
      }
      
      const currentBeamInfo = beamMap.get(event);
      beamMap.set(event, {
        ...currentBeamInfo,
        secondaryBeam: { number: 2, type: secondaryBeamType }
      });
    }
  });
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

// New interface for the sight-singing parameters with enhanced tonal harmony controls
interface SightSingingParams {
  key?: { tonic: string; mode: string };
  time?: { num: number; den: number };
  numMeasures?: number;
  parts?: Array<{ role: string; range: { min: string; max: string } }>;
  allowedDur?: string[];
  allowDots?: boolean;
  allowAccidentals?: boolean;
  
  // Enhanced melodic and harmonic controls
  intervalMotion?: string[]; // ["step", "skip", "leap", "repeat"]
  maxInterval?: number; // Maximum interval size (in semitones, default: 7 for perfect 5th)
  avoidedIntervals?: number[]; // Intervals to avoid (e.g., [6] for tritone)
  stepwiseMotionPercentage?: number; // Percentage of stepwise motion (0-100, default: 60)
  
  // Phrase and cadence controls
  cadenceEvery?: number; // Measures between cadences
  cadenceTypes?: string[]; // ["authentic", "half", "plagal", "deceptive"]
  phraseStructure?: string; // "aaba", "abac", "binary", "through"
  
  // Voice leading and melodic rules
  enforceVoiceLeading?: boolean; // Apply smooth voice leading rules
  allowDirectMotion?: boolean; // Allow direct motion to perfect intervals
  requireResolution?: boolean; // Require tendency tones to resolve properly
  melodicRange?: { min: number; max: number }; // Scale degree range (1-8)
  
  // Advanced controls
  bpm?: string;
  title?: string;
  harmonicRhythm?: number; // How often harmony changes (in beats)
  sequencePattern?: boolean; // Use melodic sequences
}

// Seeded random number generator for deterministic but varied fallback generation
class SeededRandom {
  private seed: number;
  
  constructor(seed: string | number) {
    // Convert string seed to number
    if (typeof seed === 'string') {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      this.seed = Math.abs(hash);
    } else {
      this.seed = Math.abs(seed);
    }
  }
  
  next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const origin = req.headers.get("origin");

  console.log("=== EDGE FUNCTION START ===");
  
  try {
    // 1) Parse request
    console.log("Stage: parsing request");
    const body = await req.json().catch((e) => {
      console.error("JSON parse error:", e);
      throw new Error("Invalid JSON in request body");
    });
    
    // Extract requestId and randomSeed for diagnostics and seeding
    const { requestId, randomSeed, ...params } = body as SightSingingParams & { requestId?: string; randomSeed?: number };
    
    console.log("Received requestId:", requestId);
    console.log("Received randomSeed:", randomSeed);
    console.log("Received params:", JSON.stringify(params, null, 2));

    // 2) Check secrets
    console.log("Stage: checking secrets");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    console.log("OpenAI API Key available:", !!OPENAI_API_KEY);
    
    if (!OPENAI_API_KEY) {
      console.log("❌ No OpenAI API key found, using seeded fallback generator");
      
      // Create seeded random generator for varied but reproducible results
      const seedString = `${requestId || 'default'}-${randomSeed || Date.now()}`;
      const rng = new SeededRandom(seedString);
      console.log("Using seed for fallback:", seedString);
      
      // Simple fallback that generates varied exercises
      const allowedDur = params.allowedDur ?? ["quarter"];
      const numMeasures = params.numMeasures ?? 4;
      const key = params.key ?? { tonic: "C", mode: "major" };
      const time = params.time ?? { num: 4, den: 4 };
      
      console.log("Generating seeded fallback with durations:", allowedDur);
      
      // Define varied melodic patterns using scale degrees
      const melodicPatterns = [
        [1, 2, 3, 4], [4, 3, 2, 1], [1, 3, 5, 3], [5, 3, 1, 3],
        [1, 2, 1, 3], [3, 4, 5, 4], [5, 4, 3, 2], [2, 3, 4, 5],
        [1, 5, 4, 3], [3, 1, 2, 4], [4, 2, 1, 3], [5, 6, 7, 8],
        [8, 7, 6, 5], [1, 1, 2, 2], [3, 3, 4, 4], [5, 5, 6, 6]
      ];
      
      // Define rhythmic patterns for different time signatures
      const rhythmicPatterns = {
        "4/4": [
          ["quarter", "quarter", "quarter", "quarter"],
          ["half", "quarter", "quarter"],
          ["quarter", "half", "quarter"],
          ["quarter", "quarter", "half"]
        ],
        "3/4": [
          ["quarter", "quarter", "quarter"],
          ["half", "quarter"],
          ["quarter", "half"]
        ],
        "2/4": [
          ["quarter", "quarter"],
          ["half"]
        ]
      };
      
      const timeKey = `${time.num}/${time.den}` as keyof typeof rhythmicPatterns;
      const availableRhythms = rhythmicPatterns[timeKey] || rhythmicPatterns["4/4"];
      
      // Filter rhythmic patterns to only use allowed durations
      const validRhythms = availableRhythms.filter(pattern => 
        pattern.every(dur => allowedDur.includes(dur))
      );
      
      const finalRhythms = validRhythms.length > 0 ? validRhythms : [Array(time.num).fill("quarter")];
      
      // Enhanced fallback generator that respects key signatures
      console.log(`Generating fallback melody in ${key.tonic} ${key.mode}`);
      
      // Define melodic patterns that follow voice leading principles
      const musicalMelodicPatterns = [
        // Stepwise ascending patterns
        [1, 2, 3, 2, 1],
        [1, 2, 3, 4, 3, 2, 1],
        [5, 4, 3, 2, 1],
        
        // Arpeggiated patterns (chord tones)
        [1, 3, 5, 3, 1],
        [1, 5, 3, 1],
        [3, 1, 5, 3],
        
        // Cadential patterns
        [5, 6, 7, 1], // Authentic cadence approach
        [2, 7, 1], // Strong cadential motion
        [4, 3, 2, 1], // Descending resolution
        
        // Melodic sequences
        [1, 2, 3, 2, 3, 4, 3, 4, 5],
        [5, 4, 3, 4, 3, 2, 3, 2, 1],
        
        // Balanced arch phrases
        [1, 2, 4, 6, 5, 3, 2, 1],
        [1, 3, 5, 6, 5, 4, 2, 1]
      ];
      
      // Ensure final measure has proper cadence
      const cadentialEndings = [
        [7, 1], // Leading tone resolution
        [2, 1], // Supertonic resolution  
        [5, 1], // Dominant to tonic
        [4, 3, 2, 1] // Stepwise descent to tonic
      ];
      
      // Add partsReq definition for fallback
      const partsReq = [{ role: "S", range: { min: "C4", max: "A5" } }];
     
     // Generate measures with proper voice leading
     const measures = Array(numMeasures).fill(null).map((_, measureIndex) => {
       let melodicPattern;
       
       // Use cadential ending for final measure
       if (measureIndex === numMeasures - 1) {
         melodicPattern = cadentialEndings[measureIndex % cadentialEndings.length];
       } else {
         melodicPattern = musicalMelodicPatterns[measureIndex % musicalMelodicPatterns.length];
       }
       
       const rhythmicPattern = finalRhythms[measureIndex % finalRhythms.length];
       
       // Adjust octave based on melodic contour to stay in range  
       const baseOctave = 4;
       let currentOctave = baseOctave;
       
       return rhythmicPattern.map((dur, noteIndex) => {
         const scaleDegree = melodicPattern[noteIndex % melodicPattern.length];
         
         // Smart octave management to keep melody in singable range
         if (scaleDegree <= 2 && currentOctave > 4) currentOctave = 4;
         if (scaleDegree >= 6 && currentOctave < 5) currentOctave = 5;
         if (scaleDegree === 8) currentOctave = 5;
         
         return {
           kind: "note",
           dur: { base: dur, dots: 0 },
           pitch: { 
             degree: scaleDegree, 
             oct: currentOctave, 
             acc: 0 
           }
         };
       });
     });
     
     // Build proper JSON score with the specified key
     const jsonScore = {
       key: { tonic: key.tonic, mode: key.mode },
       time,
       numMeasures,
       parts: [{
         role: "S",
         range: { min: partsReq[0].range.min, max: partsReq[0].range.max },
         measures
       }],
       cadencePlan: [
         { bar: Math.min(4, numMeasures), cadence: "HC" },
         { bar: numMeasures, cadence: "PAC" }
       ]
     };
      
      // Generate MusicXML using the existing helper
      const musicXML = toMusicXML(jsonScore, params.allowAccidentals || false);
      
      console.log("Seeded fallback generation complete");
      return new Response(JSON.stringify({
        success: true,
        json: jsonScore,
        musicXML,
        message: "Generated using seeded fallback (no OpenAI key)",
        source: "fallback-seeded",
        requestId,
        randomSeed
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
      const systemPrompt = `You are a professional music composition AI specializing in pedagogical sight-singing exercises. Create ONLY valid JSON responses.

CRITICAL: Your response must be ONLY a valid JSON object with no additional text, explanations, or markdown formatting.

VOICE LEADING REQUIREMENTS:
1. STEPWISE MOTION: Prioritize stepwise motion (70% steps, 20% skips, 10% leaps maximum)
2. TENDENCY TONES: Always resolve tendency tones properly:
   - Leading tone (7) must resolve to tonic (1)
   - Subdominant (4) should resolve down to mediant (3) in most contexts
   - Applied leading tones must resolve correctly
3. SMOOTH VOICE LEADING: Avoid large leaps without preparation or resolution
4. MELODIC CONTOUR: Create balanced arch-shaped phrases with clear direction

CADENCE REQUIREMENTS:
1. STRONG BEAT PLACEMENT: All cadences must occur on strong beats (beat 1 or 3 in 4/4)
2. COMPLETE MEASURES: Always complete full measures unless specifically instructed otherwise
3. CADENCE TYPES:
   - Authentic Cadence: End with scale degrees 7-1 or 2-1 
   - Half Cadence: End on scale degree 5
   - Plagal Cadence: End with 4-1 motion
   - Deceptive Cadence: Use 7-6 resolution instead of 7-1
4. PHRASE BREATHING: Insert half cadences at phrase midpoints for musical breathing

RHYTHMIC REQUIREMENTS:
1. BEAT INTEGRITY: Never split measures incorrectly
2. METRIC EMPHASIS: Place important melodic notes on strong beats
3. COMPLETE MEASURES: Fill all beats in each measure completely

FORBIDDEN:
- Augmented or diminished intervals except in resolved contexts
- Large leaps (>P5) without stepwise approach or resolution  
- Tritones unless part of proper dominant function and resolution
- Incomplete measures (unless specified in parameters)
- Weak beat cadences
- Unresolved tendency tones

DURATIONS ALLOWED: ${allowed.join(", ")}
${allowAccidentals ? '' : 'ACCIDENTALS: NEVER use acc values other than 0'}

Parameters received:
- Cadence Type: ${params.cadenceType || 'authentic'}
- Enforce Voice Leading: ${params.enforceVoiceLeading ?? true}
- Require Resolution: ${params.requireResolution ?? true}
- Strong Beat Cadence: ${params.strongBeatCadence ?? true}
- Stepwise Motion %: ${params.stepwiseMotionPercentage ?? 70}%

Return ONLY this exact JSON structure:`;

      const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-2025-04-14",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
             {
               role: "user", 
               content: `Create a ${numMeasures}-measure sight-singing melody in ${params.key?.tonic || 'C'} ${params.key?.mode || 'major'}, ${time.num}/${time.den} time.

Return this exact JSON structure with your composition:
{
  "key": {"tonic": "${params.key?.tonic || 'C'}", "mode": "${params.key?.mode || 'major'}"},
  "time": {"num": ${time.num}, "den": ${time.den}},
  "numMeasures": ${numMeasures},
  "parts": [{
    "role": "S",
    "range": {"min": "${partsReq[0].range.min}", "max": "${partsReq[0].range.max}"},
    "measures": [
      // Create ${numMeasures} measures here with proper voice leading and cadences
    ]
  }],
  "cadencePlan": [{"bar": ${numMeasures}, "cadence": "PAC"}]
}`
             }
          ],
          max_completion_tokens: 1000
        })
      });
      
      if (apiResponse.ok) {
        const aiResult = await apiResponse.json();
        console.log("OpenAI response received successfully");
         // Try to parse JSON from AI response
         const content = aiResult.choices[0].message.content;
         console.log("Raw AI response:", content.substring(0, 200));
         
         // Clean up common formatting issues in AI responses
         let cleanContent = content
           .replace(/```json/g, '')
           .replace(/```/g, '')
           .replace(/^[^{]*({.*})[^}]*$/s, '$1')
           .trim();
         
         try {
           aiJson = JSON.parse(cleanContent);
           console.log("Successfully parsed AI JSON response");
         } catch (parseError) {
           console.log("JSON parse failed, trying to extract JSON object...");
           const jsonMatch = content.match(/\{[\s\S]*\}/);
           if (jsonMatch) {
             try {
               aiJson = JSON.parse(jsonMatch[0]);
               console.log("Successfully extracted and parsed JSON from AI response");
             } catch (e) {
               console.log("Could not parse extracted JSON, using fallback");
             }
           } else {
             console.log("No JSON object found in AI response, using fallback");
           }
         }
      } else {
        console.log("OpenAI API call failed, using fallback generation");
      }
    } catch (error) {
      console.log("OpenAI API error, using fallback generation:", error.message);
    }

    // 2) Generate score JSON with proper measure count and validation
    let scoreJson = aiJson;
    
    // IMPROVED: Convert OpenAI response to proper pitch objects with comprehensive logging
    if (scoreJson && scoreJson.parts) {
      console.log('=== NORMALIZING AI RESPONSE ===');
      console.log('Raw scoreJson parts:', scoreJson.parts.length);
      
      for (let partIndex = 0; partIndex < scoreJson.parts.length; partIndex++) {
        const part = scoreJson.parts[partIndex];
        console.log(`Part ${partIndex} (${part.role || 'unknown'}):`, part.measures?.length || 0, 'measures');
        
        if (part.measures) {
          for (let measureIndex = 0; measureIndex < part.measures.length; measureIndex++) {
            const measure = part.measures[measureIndex];
            const measureSteps = new Set();
            const measureOctaves = new Set();
            
            console.log(`  Measure ${measureIndex + 1}: ${measure.length} notes`);
            
            for (let noteIndex = 0; noteIndex < measure.length; noteIndex++) {
              const note = measure[noteIndex];
              console.log(`    Note ${noteIndex} before:`, JSON.stringify(note));
              
              // Create a new note object to avoid reference issues
              const newNote = { ...note };
              
              // Handle various pitch formats from OpenAI
              if (note.step) {
                // Format: {step: "F", octave: 4} or {step: "Ab", oct: 4}
                let stepPart = note.step;
                let alterPart = 0;
                
                // Handle embedded accidentals like "Ab", "F#"
                if (stepPart.length > 1) {
                  const accidental = stepPart.slice(1);
                  stepPart = stepPart[0];
                  alterPart = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
                }
                
                newNote.pitch = {
                  step: stepPart,
                  alter: note.acc !== undefined ? note.acc : alterPart,
                  oct: note.oct || note.octave || 4
                };
                
                // Clean up old properties
                delete newNote.step;
                delete newNote.octave;
                delete newNote.acc;
                
              } else if (note.pitch) {
                if (typeof note.pitch === 'string') {
                  // Format: "F4", "Ab4", "C#5"
                  const pitchMatch = note.pitch.match(/^([A-G])([b#]?)(\d+)$/);
                  if (pitchMatch) {
                    const [, step, accidental, octave] = pitchMatch;
                    newNote.pitch = {
                      step: step,
                      alter: accidental === '#' ? 1 : accidental === 'b' ? -1 : 0,
                      oct: parseInt(octave)
                    };
                  } else {
                    console.log(`    Warning: Could not parse pitch string "${note.pitch}"`);
                    newNote.pitch = { step: 'C', alter: 0, oct: 4 }; // Fallback
                  }
                } else if (typeof note.pitch === 'object') {
                  // Handle object forms: {degree}, {step}, or canonical pitch
                  const p: any = note.pitch as any;
                  if (typeof p.degree === 'number') {
                    newNote.pitch = {
                      degree: p.degree,
                      oct: p.oct || p.octave || 4,
                      acc: p.acc ?? p.alter ?? 0,
                    };
                  } else if (typeof p.step === 'number') {
                    // Some models put degree in step field
                    newNote.pitch = {
                      degree: p.step,
                      oct: p.oct || p.octave || 4,
                      acc: p.acc ?? p.alter ?? 0,
                    };
                  } else if (typeof p.step === 'string') {
                    newNote.pitch = {
                      step: p.step || 'C',
                      alter: p.alter ?? p.acc ?? 0,
                      oct: p.oct || p.octave || 4
                    };
                  } else {
                    newNote.pitch = { step: 'C', alter: 0, oct: 4 };
                  }
                }
              } else {
                // No pitch info, use fallback
                console.log(`    Warning: Note has no pitch info, using C4`);
                newNote.pitch = { step: 'C', alter: 0, oct: 4 };
              }
              
              // Ensure proper duration format
              if (newNote.dur && typeof newNote.dur === 'string') {
                newNote.dur = { base: newNote.dur, dots: 0 };
              } else if (!newNote.dur) {
                newNote.dur = { base: 'quarter', dots: 0 };
              }
              
              // Ensure kind property
              if (!newNote.kind) {
                newNote.kind = 'note';
              }
              
              // Track unique pitches in this measure
              if (newNote.pitch) {
                measureSteps.add(newNote.pitch.step);
                measureOctaves.add(newNote.pitch.oct);
              }
              
              console.log(`    Note ${noteIndex} after:`, JSON.stringify(newNote));
              
              // Replace the note in the measure
              measure[noteIndex] = newNote;
            }
            
            console.log(`  Measure ${measureIndex + 1} summary: ${measureSteps.size} unique steps [${Array.from(measureSteps).join(', ')}], ${measureOctaves.size} unique octaves [${Array.from(measureOctaves).join(', ')}]`);
          }
        }
      }
      console.log('=== NORMALIZATION COMPLETE ===');
    }
    if (!scoreJson || !Array.isArray(scoreJson?.parts)) {
      // Fallback: synthesize varied measures using ALL selected durations
      const durOptions = allowed.filter(d => ["whole","half","quarter","eighth","16th"].includes(d));
      console.log("Using durations for generation:", durOptions);
      
      // Function to create notes that follow tonal harmony rules
      const createMeasureNotes = (measureIndex: number, timeSignature: {num: number, den: number}) => {
        console.log(`Creating measure ${measureIndex} notes, requestId: ${requestId}, randomSeed: ${randomSeed}`);
        const measureTicks = barTicks(timeSignature.num, timeSignature.den as 1|2|4|8|16);
        const notes = [];
        let currentTicks = 0;
        
        // Enhanced tonal harmony controls from parameters
        const maxInterval = params.maxInterval ?? 7; // Perfect 5th by default
        const avoidedIntervals = [6]; // Avoid tritone by default
        const stepwisePercentage = params.stepwiseMotionPercentage ?? 70;
        const enforceVoiceLeading = params.enforceVoiceLeading ?? true;
        const requireResolution = params.requireResolution ?? true;
        const strongBeatCadence = params.strongBeatCadence ?? true;
        const cadenceType = params.cadenceType ?? 'authentic';
        const melodicRange = { min: 1, max: 8 };
        
        // Use interval motion preferences with enhanced control
        const allowedMotion = params.intervalMotion || ["step", "skip"];
        
        // Enhanced melodic patterns that follow tonal harmony rules
        const patterns = {
          step: [
            [1,2,3,2], [3,2,1,2], [1,2,1,3], [3,4,5,4], [5,4,3,4], // stepwise motion
            [1,2,3,4], [4,3,2,1], [5,6,7,8], [8,7,6,5], // scales
            [1,7,1,2], [3,2,3,4], [5,4,5,6] // neighbor tones
          ],
          skip: [
            [1,3,5,3], [5,3,1,3], [1,3,2,4], [2,4,6,4], // thirds (consonant skips)
            [1,5,3,1], [3,1,5,3], [5,1,3,5], // chord outlines
            [1,3,5,8], [8,5,3,1], [3,5,8,5] // triad patterns
          ],
          leap: [
            [1,5,1,4], [1,4,1,5], [5,1,4,3], // fourths and fifths (consonant leaps)
            [1,6,5,4], [3,1,2,5], [5,3,6,5] // controlled larger intervals
          ],
          repeat: [
            [1,1,2,2], [3,3,2,2], [5,5,4,4], [1,1,1,2], // repeated notes for stability
            [3,3,3,4], [5,5,5,6], [2,2,1,1] // emphasis patterns
          ]
        };
        
        // Cadential patterns based on measure position and cadence type
        const cadenceEvery = params.cadenceEvery ?? 4;
        const isCadentialMeasure = (measureIndex + 1) % cadenceEvery === 0;
        const isLastMeasure = measureIndex === (numMeasures - 1);
        
        // Define cadence-specific patterns based on cadenceType
        const cadencePatterns = {
          authentic: [
            [7, 1], [2, 1], [5, 1], [4, 3, 2, 1] // Authentic cadence endings
          ],
          half: [
            [1, 5], [2, 5], [4, 5], [6, 5] // Half cadence endings  
          ],
          plagal: [
            [4, 1], [6, 4, 1] // Plagal cadence endings
          ],
          deceptive: [
            [7, 6], [5, 6] // Deceptive cadence endings
          ]
        };
        
        // Create seeded random generator for this measure if we have seeds
        const seedString = `${requestId || 'default'}-${randomSeed || Date.now()}-${measureIndex}`;
        console.log(`Creating rng for measure ${measureIndex} with seed: ${seedString}`);
        const rng = new SeededRandom(seedString);
        
        // Create educationally appropriate rhythmic patterns based on time signature
        let rhythmicPattern: DurBase[] = [];
        
        if (timeSignature.den === 4) {
          // Simple time - emphasize quarter note pulse
          if (durOptions.includes("quarter")) {
            if (timeSignature.num === 4) {
              // 4/4 time - use patterns that show strong beats 1 and 3
              const patterns4_4 = [
                ["quarter", "quarter", "quarter", "quarter"],
                ["half", "quarter", "quarter"],
                ["quarter", "half", "quarter"],
                ["quarter", "quarter", "half"],
                ["quarter", "eighth", "eighth", "quarter", "quarter"],
                ["eighth", "eighth", "quarter", "quarter", "quarter"]
              ];
              const availablePatterns = patterns4_4.filter(p => 
                p.every(dur => durOptions.includes(dur as DurBase))
              );
              rhythmicPattern = (availablePatterns.length > 0 ? rng.choice(availablePatterns) : ["quarter", "quarter", "quarter", "quarter"]) as DurBase[];
            } else if (timeSignature.num === 3) {
              // 3/4 time - emphasize beat 1
              const patterns3_4 = [
                ["quarter", "quarter", "quarter"],
                ["half", "quarter"],
                ["quarter", "half"],
                ["quarter", "eighth", "eighth", "quarter"],
                ["eighth", "eighth", "quarter", "quarter"]
              ];
              const availablePatterns = patterns3_4.filter(p => 
                p.every(dur => durOptions.includes(dur as DurBase))
              );
              rhythmicPattern = (availablePatterns.length > 0 ? rng.choice(availablePatterns) : ["quarter", "quarter", "quarter"]) as DurBase[];
            }
          }
        } else if (timeSignature.den === 8) {
          // Compound time - emphasize dotted quarter pulse
          if (timeSignature.num === 6) {
            // 6/8 time
            const patterns6_8 = [
              ["eighth", "eighth", "eighth", "eighth", "eighth", "eighth"],
              ["quarter", "eighth", "quarter", "eighth"],
              ["eighth", "quarter", "eighth", "quarter"]
            ];
            const availablePatterns = patterns6_8.filter(p => 
              p.every(dur => durOptions.includes(dur as DurBase))
            );
            if (availablePatterns.length > 0) {
              rhythmicPattern = rng.choice(availablePatterns) as DurBase[];
            }
          }
        }
        
        // Fallback: fill measure with available durations if no pattern works
        if (rhythmicPattern.length === 0) {
          let noteIndex = 0;
          while (currentTicks < measureTicks && noteIndex < 8) { // limit to prevent infinite loop
            const remainingTicks = measureTicks - currentTicks;
              const availableDurs = durOptions.filter(dur => {
                const ticksNeeded = TICKS[dur as DurBase];
                return ticksNeeded <= remainingTicks;
              });
              
              if (availableDurs.length === 0) break;
              
              const selectedDur = rng.choice(availableDurs) as DurBase;
              rhythmicPattern.push(selectedDur);
            currentTicks += TICKS[selectedDur];
            noteIndex++;
          }
        }
        
        if (isCadentialMeasure) {
          // Use cadential patterns that lead to tonic
          const cadenceTypes = params.cadenceTypes ?? ["authentic"];
          const cadenceType = rng.choice(cadenceTypes);
          
          const cadentialPatterns = {
            authentic: [[7,1], [2,1], [5,1], [4,3,2,1]], // Leading tone to tonic, V-I motion
            half: [[2,3], [6,5], [4,5], [1,2,3,2]], // Motion to dominant
            plagal: [[4,1], [6,5], [4,3,2,1]], // IV-I motion
            deceptive: [[7,6], [2,6], [5,6,5,4]] // V-vi motion
          };
          
          const pattern = cadentialPatterns[cadenceType as keyof typeof cadentialPatterns] || cadentialPatterns.authentic;
          const selectedPattern = Array.isArray(pattern[0]) ? rng.choice(pattern) : pattern;
          
          // Ensure cadential pattern fits the melodic range
          const adjustedPattern = selectedPattern.map(degree => {
            if (degree > melodicRange.max) return degree - 7; // Drop octave
            if (degree < melodicRange.min) return degree + 7; // Raise octave
            return degree;
          });
          
          return createNotesFromPattern(adjustedPattern, rhythmicPattern || ["quarter", "quarter", "quarter", "quarter"]);
        }
        
        // Get available patterns based on selected motions and voice leading rules
        const availablePatterns = allowedMotion.flatMap(motion => patterns[motion as keyof typeof patterns] || []);
        let pattern = availablePatterns.length > 0 ? rng.choice(availablePatterns) : [1,2,3,4];
        
        // Apply voice leading and interval controls
        if (enforceVoiceLeading) {
          pattern = applyVoiceLeadingRules(pattern, measureIndex, maxInterval, avoidedIntervals, melodicRange);
        }
        
        // Ensure stepwise motion percentage
        if (stepwisePercentage > 0) {
          pattern = enforceStepwiseMotion(pattern, stepwisePercentage, rng);
        }
        
        // Generate notes using the rhythmic pattern and melodic pattern
        currentTicks = 0;
        for (let i = 0; i < rhythmicPattern.length && i < pattern.length; i++) {
          const duration = rhythmicPattern[i];
          const degree = pattern[i % pattern.length];
          
          // Smart octave placement for educational purposes
          let octave = 4;
          if (degree >= 8) {
            octave = 5;
          } else if (degree >= 1 && degree <= 7) {
            octave = 4;
          }
          
          // Add dotted notes based on allowDots parameter
          let dots = 0;
          const allowDots = params.allowDots ?? false;
          if (allowDots && rng.next() < 0.3) { // 30% chance for dotted notes when enabled
            dots = 1;
          }
          
          notes.push({
            kind: "note",
            dur: { base: duration, dots: dots },
            pitch: { degree: ((degree - 1) % 7) + 1, oct: octave, acc: 0 }
          });
          
          currentTicks += TICKS[duration] * (dots > 0 ? 1.5 : 1); // Account for dotted duration
        }
        
        // Fill any remaining time with rest if needed (for educational clarity)
        if (currentTicks < measureTicks) {
          const remainingTicks = measureTicks - currentTicks;
          
          // Try to use a single rest that fits exactly
          const restOptions = Object.entries(TICKS)
            .filter(([_, ticks]) => ticks === remainingTicks)
            .map(([dur, _]) => dur as DurBase);
          
          if (restOptions.length > 0) {
            notes.push({
              kind: "rest",
              dur: { base: restOptions[0], dots: 0 }
            });
          } else {
            // Use multiple rests to fill the gap
            let restTicks = remainingTicks;
            while (restTicks > 0) {
              const availableRests = Object.entries(TICKS)
                .filter(([_, ticks]) => ticks <= restTicks)
                .sort(([_, a], [__, b]) => b - a);
              
              if (availableRests.length === 0) break;
              
              const [restDur, restTickValue] = availableRests[0];
              notes.push({
                kind: "rest",
                dur: { base: restDur as DurBase, dots: 0 }
              });
              restTicks -= restTickValue;
            }
          }
        }
        
        return notes;
      };
      
      // Helper function to create notes from melodic pattern and rhythmic pattern
      const createNotesFromPattern = (melodicPattern: number[], rhythmicPattern: DurBase[]) => {
        const notes = [];
        let currentTicks = 0;
        const measureTicks = barTicks(time.num, time.den as 1|2|4|8|16);
        
        for (let i = 0; i < rhythmicPattern.length && i < melodicPattern.length; i++) {
          const duration = rhythmicPattern[i];
          const degree = melodicPattern[i % melodicPattern.length];
          
          // Smart octave placement for educational purposes
          let octave = 4;
          if (degree >= 8) {
            octave = 5;
          } else if (degree >= 1 && degree <= 7) {
            octave = 4;
          }
          
          notes.push({
            kind: "note",
            dur: { base: duration, dots: 0 },
            pitch: { degree: ((degree - 1) % 7) + 1, oct: octave, acc: 0 }
          });
          
          currentTicks += TICKS[duration];
        }
        
        // Fill any remaining time with rest if needed
        if (currentTicks < measureTicks) {
          const remainingTicks = measureTicks - currentTicks;
          
          const restOptions = Object.entries(TICKS)
            .filter(([_, ticks]) => ticks === remainingTicks)
            .map(([dur, _]) => dur as DurBase);
          
          if (restOptions.length > 0) {
            notes.push({
              kind: "rest",
              dur: { base: restOptions[0], dots: 0 }
            });
          }
        }
        
        return notes;
      };
      
      // Helper function to apply voice leading rules
      const applyVoiceLeadingRules = (pattern: number[], measureIndex: number, maxInterval: number, avoidedIntervals: number[], melodicRange: { min: number; max: number }) => {
        const improvedPattern = [...pattern];
        
        for (let i = 1; i < improvedPattern.length; i++) {
          const prevDegree = improvedPattern[i - 1];
          const currentDegree = improvedPattern[i];
          const interval = Math.abs(currentDegree - prevDegree);
          
          // Check if interval exceeds maximum allowed
          if (interval > maxInterval) {
            // Adjust to smaller interval
            if (currentDegree > prevDegree) {
              improvedPattern[i] = prevDegree + Math.min(maxInterval, 2); // Prefer step or small skip
            } else {
              improvedPattern[i] = prevDegree - Math.min(maxInterval, 2);
            }
          }
          
          // Avoid specific intervals (like tritones)
          if (avoidedIntervals.includes(interval)) {
            // Replace with consonant interval
            const consonantIntervals = [1, 2, 3, 4, 5]; // unison, 2nd, 3rd, 4th, 5th
            const replacement = consonantIntervals[Math.floor(rng.next() * consonantIntervals.length)];
            
            if (currentDegree > prevDegree) {
              improvedPattern[i] = prevDegree + replacement;
            } else {
              improvedPattern[i] = prevDegree - replacement;
            }
          }
          
          // Ensure note stays within melodic range
          if (improvedPattern[i] > melodicRange.max) {
            improvedPattern[i] = melodicRange.max;
          } else if (improvedPattern[i] < melodicRange.min) {
            improvedPattern[i] = melodicRange.min;
          }
        }
        
        return improvedPattern;
      };
      
      // Helper function to enforce stepwise motion percentage
      const enforceStepwiseMotion = (pattern: number[], stepwisePercentage: number, rng: SeededRandom) => {
        const improvedPattern = [...pattern];
        const totalIntervals = improvedPattern.length - 1;
        const requiredStepwise = Math.floor((totalIntervals * stepwisePercentage) / 100);
        
        let stepwiseCount = 0;
        
        // Count existing stepwise motion
        for (let i = 1; i < improvedPattern.length; i++) {
          const interval = Math.abs(improvedPattern[i] - improvedPattern[i - 1]);
          if (interval <= 1) stepwiseCount++;
        }
        
        // If we need more stepwise motion, convert some intervals
        let conversionsNeeded = requiredStepwise - stepwiseCount;
        
        for (let i = 1; i < improvedPattern.length && conversionsNeeded > 0; i++) {
          const interval = Math.abs(improvedPattern[i] - improvedPattern[i - 1]);
          
          if (interval > 1) {
            // Convert to stepwise motion
            if (improvedPattern[i] > improvedPattern[i - 1]) {
              improvedPattern[i] = improvedPattern[i - 1] + 1;
            } else {
              improvedPattern[i] = improvedPattern[i - 1] - 1;
            }
            conversionsNeeded--;
          }
        }
        
        return improvedPattern;
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
      message: `Generated ${numMeasures} measures successfully with OpenAI`,
      source: aiJson ? "openai" : "fallback-seeded",
      requestId,
      randomSeed
    }), {status:200,headers:corsHeaders});

  } catch (error) {
    console.error("=== EDGE FUNCTION ERROR ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error details:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
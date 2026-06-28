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

function esc(s:string|number|undefined){ 
  const str = String(s || "");
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;"); 
}

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
  console.log('Creating note XML for pitch:', { step, alter, oct, originalPitch: ev.pitch });
  
  // Ensure step is a valid string
  const validStep = typeof step === 'string' && step.length === 1 && /[A-G]/.test(step) ? step : 'C';
  const alterXml = alter ? `<alter>${alter}</alter>` : "";
  return `<note>${tieStart}<pitch><step>${validStep}</step>${alterXml}<octave>${oct}</octave></pitch><duration>${dur}</duration><type>${typeMap[base]}</type>${dotsXml}${beamXml}${tieStop}</note>`;
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

// ===========================================================================
//  Rule-based sight-reading generator (replaces the AI / pattern fallback)
//
//  Mirrors the music21 algorithm: pick a difficulty level, lay out one
//  measure at a time, fill it with notes whose durations sum exactly to
//  the meter, choose each pitch by a stepwise (or small-leap) walk from
//  the previous one, and force the final note onto the tonic. Result is
//  mathematically valid, predictable, and pedagogically sound — no AI in
//  the loop and no "applyVoiceLeadingRules" runtime surprises.
// ===========================================================================

interface LevelConfig {
  /** Allowed scale degrees relative to tonic (positive = up, negative = down). */
  rangeLow: number;
  rangeHigh: number;
  /** Largest melodic step allowed when picking the next note. 1 = stepwise. */
  maxStep: number;
  /** Note durations allowed in this level. Beat values assume den=4 meter. */
  durations: Array<"whole" | "half" | "quarter" | "eighth" | "16th">;
  /** Whether to allow rests in the body of the exercise. */
  allowRests: boolean;
}

const LEVELS: Record<number, LevelConfig> = {
  // `maxStep` is scale-degree distance per move. Capped at 5 across the
  // board now (a sixth) — the previous level-5 value of 7 produced
  // descending-seventh leaps that broke common-practice melodic rules.
  // Diatonic leaps wider than a sixth are reserved for advanced material
  // outside the rule-based generator's scope.
  1: { rangeLow: 1, rangeHigh: 8,  maxStep: 1, durations: ["quarter", "half"],                       allowRests: false },
  2: { rangeLow: 1, rangeHigh: 8,  maxStep: 2, durations: ["quarter", "half", "eighth"],             allowRests: false },
  3: { rangeLow: 1, rangeHigh: 10, maxStep: 3, durations: ["quarter", "half", "eighth", "whole"],    allowRests: true  },
  4: { rangeLow: -1, rangeHigh: 10, maxStep: 4, durations: ["quarter", "half", "eighth", "16th", "whole"], allowRests: true },
  5: { rangeLow: -3, rangeHigh: 12, maxStep: 5, durations: ["quarter", "half", "eighth", "16th", "whole"], allowRests: true },
};

const BEATS_BY_DUR: Record<string, number> = {
  whole: 4, half: 2, quarter: 1, eighth: 0.5, "16th": 0.25,
};

function buildNoteFromDegree(
  key: { tonic: string; mode: "major" | "minor" },
  degreeOffsetFromTonic: number, // 0 = tonic, can go negative / >7
  baseOct: number,                // octave the tonic lives in (e.g. 4 = middle C)
  durBase: string,
  dots = 0,
) {
  // Defensive uppercase on the tonic letter so callers sending "g"
  // (lower-case) don't silently miss in LETTERS.indexOf.
  const tonicLetter = key.tonic.replace(/b|#/g, "")[0].toUpperCase();
  const tonicIdx = LETTERS.indexOf(tonicLetter);
  // Hoist the absolute index so we use the same value for the letter
  // wrap AND the octave bump — keeps them in lock-step for negative
  // offsets in non-C keys.
  const absoluteDiatonicIdx = tonicIdx + degreeOffsetFromTonic;
  const targetIdx = ((absoluteDiatonicIdx % 7) + 7) % 7;
  const octBump = Math.floor(absoluteDiatonicIdx / 7);
  const letter = LETTERS[targetIdx];
  // Apply key signature accidentals (e.g. F# in G major).
  const baseAlter = defaultAlterMap(key.tonic, key.mode)[letter] || 0;
  return {
    kind: "note",
    pitch: { step: letter, alter: baseAlter, oct: baseOct + octBump },
    dur: { base: durBase, dots },
  };
}

function generateRuleBasedScore(
  params: {
    key: { tonic: string; mode: "major" | "minor" };
    time: { num: number; den: 1 | 2 | 4 | 8 | 16 };
    numMeasures: number;
    level: number;
  },
  rng: SeededRandom,
) {
  const { key, time, numMeasures } = params;
  const cfg = LEVELS[Math.max(1, Math.min(5, params.level))];
  const beatsPerMeasure = time.num * (4 / time.den);
  const baseOct = 4;

  // Walk one scale-degree offset from tonic. 0 = tonic, 1 = supertonic, etc.
  let currentDegreeOffset = 0;
  // Track the LAST step (signed scale-degree distance). Used for the
  // "after a leap, step back" voice-leading rule — common-practice
  // melodic writing recovers from a leap of a fourth or wider by
  // moving by step in the opposite direction.
  let lastStep = 0;
  const measures: any[][] = [];

  for (let m = 0; m < numMeasures; m++) {
    const measure: any[] = [];
    let beatsLeft = beatsPerMeasure;
    const isLastMeasure = m === numMeasures - 1;

    while (beatsLeft > 0) {
      // Pick a duration that fits the remaining beats. Last measure
      // ends on a half-note (clean cadence per the algorithm spec).
      const valid = cfg.durations.filter((d) => BEATS_BY_DUR[d] <= beatsLeft);
      let durBase: string;
      if (isLastMeasure && beatsLeft === 2 && valid.includes("half")) {
        durBase = "half";
      } else if (isLastMeasure && beatsLeft === beatsPerMeasure && valid.includes("half")) {
        // Start the last measure with a half to leave room for a clean tonic.
        durBase = "half";
      } else {
        durBase = rng.choice(valid);
      }

      // Pick the next scale-degree offset.
      //
      //   - FIRST note of the piece: anchored to the tonic (degree 1)
      //     for levels 1–3 (basic / intermediate sight-singing). Tonal
      //     melodies establish key by starting on the tonic; starting
      //     on degree 2, 3, etc. is a hallmark of advanced exercises
      //     where students already know how to find the tonic from
      //     context. Levels 4–5 keep the free starting note so
      //     advanced students can practice that skill.
      //   - LAST note of the piece: also tonic (clean cadence).
      //   - EVERYTHING ELSE: stepwise / small-leap walk inside the
      //     level's allowed range.
      const isFirstNote = m === 0 && beatsLeft === beatsPerMeasure;
      // Penultimate-note detection: the note we're about to push is
      // the SECOND-TO-LAST note IF (a) we're in the last measure AND
      // (b) the beats remaining after this note will exactly fill ONE
      // more event of the chosen final duration. We simplify to "last
      // measure + this isn't itself the final beat" — the final-note
      // anchor below handles the closer.
      const willBeFinalNote = isLastMeasure && beatsLeft === BEATS_BY_DUR[durBase];
      const willBePenultimate = isLastMeasure && !willBeFinalNote &&
        (beatsLeft - BEATS_BY_DUR[durBase]) <= BEATS_BY_DUR[durBase] * 1.5;

      let nextOffset: number;
      if (isFirstNote && params.level <= 3) {
        nextOffset = 0;
      } else if (willBeFinalNote) {
        // Final note → tonic. By config invariant, every level has
        // rangeLow ≤ 1 ≤ rangeHigh, so 0 is always in range.
        nextOffset = 0;
      } else if (willBePenultimate) {
        // Penultimate note must approach the final tonic by step.
        // Common practice resolves degree 2→1 (descending) or
        // degree 7→1 (ascending leading tone). Pick whichever is
        // closer to the current note so the cadence feels smooth.
        const opt2 = 1;   // supertonic
        const opt7 = -1;  // leading tone (one diatonic step below tonic)
        nextOffset = Math.abs(currentDegreeOffset - opt2) <= Math.abs(currentDegreeOffset - opt7)
          ? opt2
          : opt7;
      } else {
        let step = rng.nextInt(-cfg.maxStep, cfg.maxStep);
        // 65% of the time prefer stepwise (|step| <= 1) for singability.
        if (Math.abs(step) > 1 && rng.next() < 0.65) {
          step = rng.nextInt(-1, 1);
        }
        // Leap-recovery rule. After a leap of a fourth or wider, the
        // next move should be by step in the opposite direction —
        // canonical voice-leading for vocal music. Without this rule
        // the generator would happily leap a sixth up and then a
        // fifth down, producing zigzag lines that are hard to sing.
        if (Math.abs(lastStep) >= 3) {
          const recoveryDir = -Math.sign(lastStep);
          step = recoveryDir; // single diatonic step opposite the leap
        }
        nextOffset = currentDegreeOffset + step;
        // Reflect off the range edges so the walk never escapes the
        // level's allowed pitch territory.
        if (nextOffset > cfg.rangeHigh - 1) nextOffset = currentDegreeOffset - 1;
        if (nextOffset < cfg.rangeLow - 1)  nextOffset = currentDegreeOffset + 1;
      }

      // Track the actual step taken (signed scale-degree distance)
      // so the next iteration can apply the leap-recovery rule.
      lastStep = nextOffset - currentDegreeOffset;
      currentDegreeOffset = nextOffset;
      measure.push(buildNoteFromDegree(key, nextOffset, baseOct, durBase));
      beatsLeft -= BEATS_BY_DUR[durBase];

      // Snap-correct floating point dust (eighth notes can leave 1e-16 stubs).
      if (beatsLeft < 0.001) beatsLeft = 0;
    }

    measures.push(measure);
  }

  return {
    key,
    time,
    numMeasures,
    parts: [{
      role: "S",
      range: { min: "C4", max: "C6" },
      measures,
    }],
  };
}

// ===========================================================================
//  Edge function entry point
// ===========================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => { throw new Error("Invalid JSON body"); });
    const { requestId, randomSeed, ...params } = body as any;

    const seedString = `${requestId || "default"}-${randomSeed || Date.now()}`;
    const rng = new SeededRandom(seedString);

    const key = params.key ?? { tonic: "C", mode: "major" };
    const time = params.time ?? { num: 4, den: 4 };
    const numMeasures = params.numMeasures ?? 4;
    const level = params.level ?? 1;

    console.log(`[generate] level=${level} key=${key.tonic} ${key.mode} time=${time.num}/${time.den} measures=${numMeasures}`);

    const scoreJson = generateRuleBasedScore({ key, time, numMeasures, level }, rng);
    const xml = toMusicXML(scoreJson, /* allowAccidentals */ false);

    return new Response(JSON.stringify({
      success: true,
      json: scoreJson,
      musicXML: xml,
      musicxml: xml, // legacy property the frontend also reads
      exerciseId: `${seedString}`,
      source: "rule-based-v2",
      requestId,
      randomSeed,
      message: `Generated ${numMeasures} measures (level ${level}) in ${key.tonic} ${key.mode}.`,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("[generate] error", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

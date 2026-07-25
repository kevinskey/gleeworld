import type { ExerciseIR, IRNote } from './ir';
import { midiToSolfege, KEY_TO_MIDI } from './ir';

// Voice ranges — comfortable middle-of-range spans so an exercise sits
// centrally on the voice's tessitura rather than pushed to the extremes.
// Bass/tenor MIDI numbers are the actual sounding pitch; NotationView
// auto-picks bass clef when the median is below A3 so the score renders
// on the right staff without an explicit clef prop.
export type Voice = 'soprano' | 'alto' | 'tenor' | 'bass';
const VOICE_RANGE: Record<Voice, { lo: number; hi: number }> = {
  soprano: { lo: 60, hi: 81 }, // C4 – A5
  alto:    { lo: 55, hi: 76 }, // G3 – E5
  tenor:   { lo: 48, hi: 67 }, // C3 – G4
  bass:    { lo: 40, hi: 60 }, // E2 – C4
};

// Motive-driven, phrase-structured tonal melody generator. Works in
// SCALE-DEGREE-INDEX space: a "step" is ±1 index in the mode's scale, a
// diatonic sequence up a step is "+1 to every note". Seeded determinism is
// preserved (same {level,key,seed,bars,mode} → identical notes) so a student
// can be re-sent the exact exercise they were assigned.

type Mode = 'major' | 'minor';
interface Slot { deg: number; dur: number; strong: boolean; midi?: number; }

const PENT_SCALE      = [0, 2, 4, 7, 9];
const MAJOR_SCALE     = [0, 2, 4, 5, 7, 9, 11];
const NAT_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

const CHORDS_MAJOR: Record<string, number[]> = {
  I: [0, 4, 7], ii: [2, 5, 9], IV: [5, 9, 0], V: [7, 11, 2], vi: [9, 0, 4],
};
const CHORDS_MINOR: Record<string, number[]> = {
  i: [0, 3, 7], iv: [5, 8, 0], V: [7, 11, 2], VI: [8, 0, 3], ii: [2, 5, 8],
};

const SHAPES_SIMPLE = [[0, 1, 2, 1], [0, 2, 1, 0], [0, -1, 0, 1], [0, 1, 0, -1]];
const SHAPES_RICH   = [...SHAPES_SIMPLE, [0, 1, 2, 3], [0, 2, 4, 2], [0, -1, -2, -1]];

// EVERY rhythm cell sums to exactly 4 beats (one 4/4 bar). Verified by
// assertion below on module load.
const RHYTHMS: Record<number, number[][]> = {
  1: [[1, 1, 1, 1]],
  2: [[1, 1, 1, 1], [2, 1, 1], [2, 2]],
  3: [[1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [2, 2]],
  4: [[1, 1, 1, 1], [2, 1, 1], [0.5, 0.5, 1, 2], [1, 1, 0.5, 0.5, 1]],
  5: [[1, 1, 1, 1], [0.5, 0.5, 1, 1, 1], [2, 1, 1], [0.5, 0.5, 1, 2]],
  // NOTE: the spec's level-6 dotted cells ([1.5,0.5,…]) contain LONE eighths that
  // cannot beam within their beat, violating the beam-grid verification criterion.
  // Per the "fix the algorithm, don't weaken the criterion" instruction, they are
  // replaced with eighth-PAIR cells (still summing to 4) that give level 6 denser
  // eighth activity than level 5 while staying beamable.
  6: [[1, 1, 1, 1], [0.5, 0.5, 0.5, 0.5, 1, 1], [0.5, 0.5, 1, 0.5, 0.5, 1], [0.5, 0.5, 1, 2]],
};
for (const [lvl, cells] of Object.entries(RHYTHMS)) {
  for (const cell of cells) {
    const sum = cell.reduce((s, d) => s + d, 0);
    if (Math.abs(sum - 4) > 1e-9) {
      throw new Error(`RHYTHMS[${lvl}] cell ${JSON.stringify(cell)} sums to ${sum}, not 4`);
    }
  }
}

interface LevelCfg { pentatonic: boolean; shapes: number[][]; bars: number; }
const LEVELS: Record<number, LevelCfg> = {
  1: { pentatonic: true,  shapes: SHAPES_SIMPLE, bars: 2 },
  2: { pentatonic: true,  shapes: SHAPES_SIMPLE, bars: 4 },
  3: { pentatonic: false, shapes: SHAPES_SIMPLE, bars: 4 },
  4: { pentatonic: false, shapes: SHAPES_RICH,   bars: 4 },
  5: { pentatonic: false, shapes: SHAPES_RICH,   bars: 8 },
  6: { pentatonic: false, shapes: SHAPES_RICH,   bars: 8 },
};

// Deterministic PRNG (mulberry32) — a seed must always yield the same line.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- module-scope pure helpers ---

// degree-index (in `scale`) → absolute MIDI, tonic-relative.
const degToMidi = (deg: number, scale: number[], tonic: number): number => {
  const N = scale.length;
  const oct = Math.floor(deg / N);
  const pos = ((deg % N) + N) % N;
  return tonic + 12 * oct + scale[pos];
};

// pitch-class of a degree-index (tonic-relative, octave-reduced).
const degPc = (deg: number, scale: number[]): number => {
  const N = scale.length;
  const pos = ((deg % N) + N) % N;
  return ((scale[pos] % 12) + 12) % 12;
};

// Sample the motive's contour at a (possibly fractional) beat within the bar.
// On-beat = the shape value; off-beat = an interpolated (passing) tone.
const contourAt = (shape: number[], beat: number): number => {
  const i = Math.floor(beat), frac = beat - i;
  if (frac < 1e-9) return shape[Math.min(i, 3)];
  const a = shape[Math.min(i, 3)], b = shape[Math.min(i + 1, 3)];
  return Math.round(a + frac * (b - a));
};

// --- skeleton (one implied chord per bar, by phrase role) ---
function buildSkeleton(
  numPhrases: number, phraseLen: number, pentatonic: boolean, mode: Mode,
  pick: <T>(xs: T[]) => T,
): string[][] {
  const chords = mode === 'minor' ? CHORDS_MINOR : CHORDS_MAJOR;
  const TONIC = mode === 'minor' ? 'i' : 'I';
  const SUBM  = mode === 'minor' ? 'VI' : 'vi';
  const SUBD  = mode === 'minor' ? 'iv' : 'IV';
  void chords; void pick;
  const skeleton: string[][] = [];
  for (let p = 0; p < numPhrases; p++) {
    const isFinal = p === numPhrases - 1;
    let roles: string[];
    if (pentatonic) {
      // pentatonic → stay in the tonic area (no functional harmony implied).
      roles = Array.from({ length: phraseLen }, () => TONIC);
    } else if (phraseLen === 2) {
      roles = isFinal ? ['V', TONIC] : [TONIC, 'V'];
    } else if (phraseLen === 4) {
      roles = isFinal ? [TONIC, SUBD, 'V', TONIC] : [TONIC, SUBM, SUBD, 'V'];
    } else {
      // phraseLen === 1
      roles = isFinal ? [TONIC] : ['V'];
    }
    skeleton.push(roles);
  }
  return skeleton;
}

interface Transform { offset?: number; invert?: boolean; rhythmVar?: boolean; climaxBoost?: number; }
function chooseTransform(
  p: number, b: number, climaxPhrase: number, climaxBar: number,
  rand: () => number, pick: <T>(xs: T[]) => T,
): Transform {
  if (p === 0 && b === 0) return { offset: 0 }; // statement of the motive
  if (p === climaxPhrase && b === climaxBar) return { offset: 1, climaxBoost: 2 };
  void rand;
  const kind = pick(['repeat', 'repeat', 'seqUp', 'seqDown', 'rhythmVar', 'invert']);
  switch (kind) {
    case 'seqUp':    return { offset: 1 };
    case 'seqDown':  return { offset: -1 };
    case 'invert':   return { invert: true };
    case 'rhythmVar': return { rhythmVar: true };
    default:         return { offset: 0 };
  }
}

export function generateExercise(
  opts: { level: number; key: string; seed: number; bars?: number; mode?: Mode; voice?: Voice },
): ExerciseIR {
  const lv = LEVELS[opts.level] ?? LEVELS[1];
  const mode: Mode = opts.mode ?? 'major';
  const rand = rng(opts.seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  const bars = (opts.bars && opts.bars > 0 ? opts.bars : lv.bars);
  const pentatonic = lv.pentatonic;
  const scale: number[] = pentatonic ? PENT_SCALE : (mode === 'minor' ? NAT_MINOR_SCALE : MAJOR_SCALE);
  const chords = mode === 'minor' ? CHORDS_MINOR : CHORDS_MAJOR;
  const N = scale.length;

  // Tonic + ambitus. When a voice is specified, shift the tonic into the
  // voice's range and use that range as the ambitus so the line sits in
  // the voice's actual tessitura (bass in E — the exercise should live
  // around E3, not scream up at E5). Without a voice, keep the legacy
  // tonic−5..tonic+12 span centered on C4.
  const baseTonic = KEY_TO_MIDI[opts.key] ?? 60;
  let tonic = baseTonic;
  let AMBITUS_LO: number;
  let AMBITUS_HI: number;
  if (opts.voice) {
    const range = VOICE_RANGE[opts.voice];
    // Shift the tonic by whole octaves to land closest to the range midpoint.
    const mid = (range.lo + range.hi) / 2;
    let bestTonic = baseTonic;
    let bestDist = Math.abs(baseTonic - mid);
    for (let oct = -4; oct <= 4; oct++) {
      const cand = baseTonic + oct * 12;
      if (cand < range.lo || cand > range.hi) continue;
      const dist = Math.abs(cand - mid);
      if (dist < bestDist) { bestDist = dist; bestTonic = cand; }
    }
    tonic = bestTonic;
    AMBITUS_LO = range.lo;
    AMBITUS_HI = range.hi;
  } else {
    AMBITUS_LO = tonic - 5;
    AMBITUS_HI = tonic + 12;
  }
  const clampDeg = (deg: number): number => {
    let d = deg;
    let guard = 0;
    while (degToMidi(d, scale, tonic) > AMBITUS_HI && guard++ < 8) d -= N;
    guard = 0;
    while (degToMidi(d, scale, tonic) < AMBITUS_LO && guard++ < 8) d += N;
    return d;
  };

  // nearest degree whose pitch-class ∈ pcs, searching [0,-1,+1,-2,+2,...].
  const snap = (target: number, pcs: number[]): number => {
    const order = [0];
    for (let k = 1; k <= N * 2; k++) { order.push(-k); order.push(k); }
    for (const off of order) {
      const d = target + off;
      if (pcs.includes(degPc(d, scale))) return clampDeg(d);
    }
    return clampDeg(target);
  };

  // degree-index of the nearest do (tonic pitch-class) octave to `ref`.
  const nearestDoDeg = (ref: number): number => {
    // do is degree 0 mod N (pc 0). Candidate do degrees: k*N.
    let best = 0, bestDist = Infinity;
    for (let k = -3; k <= 3; k++) {
      const d = k * N;
      const dist = Math.abs(degToMidi(d, scale, tonic) - degToMidi(ref, scale, tonic));
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    return best;
  };

  const skeleton = buildSkeleton(numPhrases, phraseLen, pentatonic, mode, pick);
  // The piece must open on the tonic so the first downbeat lands on a tonic-triad
  // member. buildSkeleton's final-phrase form opens on V, which for a single-phrase
  // line would (wrongly) start the whole exercise on the dominant.
  if (skeleton.length && skeleton[0].length) skeleton[0][0] = mode === 'minor' ? 'i' : 'I';

  // --- MOTIVE: one 1-bar pitch shape + one home rhythm cell ---
  const shape = pick(lv.shapes);
  const rhythmCells = RHYTHMS[opts.level] ?? RHYTHMS[1];
  const homeRhythm = pick(rhythmCells);

  // Render one bar of the motive. The register comes from an explicit melodic ARC
  // (`arcLift`, in scale-degree steps above the central do), so the line traces a
  // clear rise to the climax and back rather than octave-drifting to chase seams.
  const renderMotiveBar = (chordPCs: number[], transform: Transform, arcLift: number): Slot[] => {
    const cell = transform.rhythmVar ? pick(rhythmCells) : homeRhythm;
    const offset = transform.offset ?? 0;
    const invert = !!transform.invert;
    const anchor = nearestDoDeg(0) + arcLift + offset + (transform.climaxBoost ?? 0);

    const slots: Slot[] = [];
    let beat = 0;
    for (const dur of cell) {
      const c = contourAt(shape, beat);
      let deg = clampDeg(anchor + (invert ? -c : c));
      const strong = Math.abs(beat - Math.round(beat)) < 1e-9 && Math.round(beat) % 2 === 0;
      if (strong) deg = snap(deg, chordPCs);
      slots.push({ deg, dur, strong });
      beat += dur;
    }
    return slots;
  };

  // --- CADENCE bars ---
  const makeCadenceBar = (
    kind: 'authentic' | 'half', chordPCs: number[], baseReg: number,
  ): Slot[] => {
    if (kind === 'authentic') {
      // Single whole-note tonic on the downbeat.
      return [{ deg: clampDeg(nearestDoDeg(baseReg)), dur: 4, strong: true }];
    }
    // half cadence (antecedent): end on 5̂, held.
    const solDeg = snap(baseReg, [7]);
    const opener = snap(baseReg, chordPCs);
    return [
      { deg: opener,           dur: 1, strong: true },
      { deg: clampDeg(solDeg - 1), dur: 1, strong: false },
      { deg: solDeg,           dur: 2, strong: true },
    ];
  };

  // The last content bar is a stepwise cadential descent that lands on the resolving
  // tendency tone (2̂→1̂ pentatonic; 7̂→1̂ diatonic). Consecutive scale-degree steps are
  // always <4 semitones, so the descent never introduces a leap and gives the line a
  // clean approach to the final tonic. Its top note doubles as the climax apex for
  // short (4-bar) lines. Never rendered as bar 0 (which must open on the tonic triad).
  const tendencyDeg = pentatonic ? nearestDoDeg(0) + 1 : nearestDoDeg(0) - 1;
  const makeCadentialBar = (cell: number[]): Slot[] => {
    const K = cell.length;
    const slots: Slot[] = [];
    let beat = 0;
    for (let k = 0; k < K; k++) {
      const strong = Math.abs(beat - Math.round(beat)) < 1e-9 && Math.round(beat) % 2 === 0;
      slots.push({ deg: clampDeg(tendencyDeg + (K - 1 - k)), dur: cell[k], strong });
      beat += cell[k];
    }
    return slots;
  };

  // A stepwise arch peaking on a strong beat at `la` (a moderate apex, well below the
  // ceiling), rising and falling by single scale degrees. Locked so it stays a clean,
  // leap-free high point that connects to the surrounding register without a cliff.
  // deg5 = do' (tonic+12) in pentatonic, la (tonic+9) diatonic — in both cases
  // strictly above the cadential descent's top, so the climax is the unique max.
  const climaxApexDeg = nearestDoDeg(0) + 5;
  const makeClimaxBar = (cell: number[]): Slot[] => {
    const K = cell.length;
    const kPeak = Math.min(2, K - 1); // land the apex on beat 3 (a strong beat)
    const slots: Slot[] = [];
    let beat = 0;
    for (let k = 0; k < K; k++) {
      const strong = Math.abs(beat - Math.round(beat)) < 1e-9 && Math.round(beat) % 2 === 0;
      slots.push({ deg: clampDeg(climaxApexDeg - Math.abs(kPeak - k)), dur: cell[k], strong });
      beat += cell[k];
    }
    return slots;
  };

  // --- LAYOUT / compose bar by bar ---
  const line: Slot[] = [];
  const baseReg = 0; // central register anchor (do at tonic)
  const lockedCadential = new Set<number>(); // indices of the locked cadential descent

  // Determine, per absolute bar, its (phrase p, bar-in-phrase b) and whether it
  // is a cadence bar. Phrases cover phraseLen bars each; the last phrase absorbs
  // any remainder.
  interface BarPlan { p: number; b: number; roles: string[]; isPhraseEnd: boolean; isFinalBar: boolean; }
  const barPlans: BarPlan[] = [];
  {
    let bar = 0;
    for (let p = 0; p < numPhrases; p++) {
      const roles = skeleton[p];
      const len = p === numPhrases - 1 ? bars - bar : phraseLen;
      for (let b = 0; b < len; b++) {
        barPlans.push({
          p, b, roles,
          isPhraseEnd: b === len - 1,
          isFinalBar: bar === bars - 1,
        });
        bar++;
      }
    }
  }

  // Absolute index of the climax bar, and a triangular ARC (in scale-degree steps)
  // rising to it and falling back for the cadence — this is what gives the line a
  // shape instead of a drone.
  let climaxAbsBar = climaxBarInPhrase;
  for (let p = 0; p < climaxPhrase; p++) climaxAbsBar += (p === numPhrases - 1 ? bars - p * phraseLen : phraseLen);
  const lastContentBar = bars - 2; // final bar (bars−1) is the cadence
  const MAXLIFT = pentatonic ? 3 : 4;
  const rise = Math.max(1, climaxAbsBar);
  const fall = Math.max(1, lastContentBar - climaxAbsBar);
  const arcLift = (bi: number): number =>
    bi <= climaxAbsBar
      ? Math.round(MAXLIFT * bi / rise)
      : Math.max(0, Math.round(MAXLIFT * (lastContentBar - bi) / fall));

  for (let i = 0; i < barPlans.length; i++) {
    const plan = barPlans[i];
    const role = plan.roles[Math.min(plan.b, plan.roles.length - 1)];
    const chordPCs = chords[role] ?? [0];

    let barSlots: Slot[];
    let cadential = false;
    if (plan.isFinalBar) {
      // Authentic cadence: single whole-note tonic. Force the penultimate bar's
      // last slot to the resolving tendency tone BEFORE pushing this bar (covers
      // the 2-bar case where the penultimate bar is the un-rewritten opening motive).
      if (line.length > 0) {
        line[line.length - 1].deg = clampDeg(tendencyDeg);
        line[line.length - 1].midi = undefined;
      }
      barSlots = makeCadenceBar('authentic', chordPCs, baseReg);
    } else if (i === lastContentBar && i >= 1) {
      // Stepwise cadential descent in even quarters (never bar 0). A fixed 4-note
      // cell gives the descent a top of tendency+3 — a real apex above the tonic —
      // and lands cleanly on the tendency tone. Locked so post-processing can't
      // disturb the approach to the tonic.
      barSlots = makeCadentialBar([1, 1, 1, 1]);
      cadential = true;
    } else if (i === climaxAbsBar && i >= 1) {
      // Locked stepwise climax arch (moderate apex), avoiding a register cliff.
      barSlots = makeClimaxBar([1, 1, 1, 1]);
      cadential = true;
    } else if (plan.isPhraseEnd && !pentatonic && role === 'V' && plan.p < numPhrases - 1) {
      // Antecedent half cadence on 5̂.
      barSlots = makeCadenceBar('half', chordPCs, baseReg);
    } else {
      const transform = chooseTransform(plan.p, plan.b, climaxPhrase, climaxBarInPhrase, rand, pick);
      barSlots = renderMotiveBar(chordPCs, transform, arcLift(i));
    }

    for (const s of barSlots) { if (cadential) lockedCadential.add(line.length); line.push(s); }
  }

  // --- POST-PROCESS ---
  // 1) Resolve leaps. 2) Carve exactly one step-approached climax in the 2nd half
  // (protecting the final cadence tonic). 3) A final leap-repair that treats the
  // apex and the cadence tonic as immovable, so it cannot flatten the climax.
  // Index 0 is the tonic-triad opening (do, snapped on the downbeat) and must never
  // be moved by post-processing, else the line would not begin on a triad member.
  const structuralLock = new Set([0, ...lockedCadential]);
  repairMelody(line, scale, tonic, N, structuralLock);
  // The apex lives in the design's climax bar (its beat window). enforceSingleClimax
  // makes it the sole high point; the cadential descent and opening are left untouched.
  const protectedIdx = enforceSingleClimax(line, climaxAbsBar * 4, scale, tonic, N, tonic - 5, tonic + 12, structuralLock);
  const finalLock = new Set([...protectedIdx, ...structuralLock]);
  repairMelody(line, scale, tonic, N, finalLock);
  // Minor inflection runs LAST (after leap-repair, which works in raw-degree space
  // and would otherwise clobber a stamped pitch), so the raised leading tone and the
  // aug-2nd avoidance survive into the emitted notes.
  if (mode === 'minor') inflectMinor(line, scale, tonic);

  // --- EMIT ---
  const beatsTotal = bars * 4;
  const phraseBeats = phraseLen * 4;
  let cursor = 0;
  const notes: IRNote[] = line.map((s) => {
    const midi = s.midi ?? degToMidi(s.deg, scale, tonic);
    const note: IRNote = {
      midi,
      beatPos: cursor,
      durationBeats: s.dur,
      solfege: midiToSolfege(midi, tonic),
      phraseIdx: Math.min(numPhrases - 1, Math.floor(cursor / phraseBeats)),
    };
    cursor += s.dur;
    return note;
  });

  const lastNote = notes.at(-1)!;
  if (Math.abs(lastNote.beatPos + lastNote.durationBeats - beatsTotal) > 1e-9) {
    throw new Error(`generateExercise: realized-length invariant violated (${lastNote.beatPos + lastNote.durationBeats} !== ${beatsTotal}) for level=${opts.level} key=${opts.key} seed=${opts.seed} bars=${bars}`);
  }
  if (Math.max(...notes.map((n) => n.phraseIdx)) >= numPhrases) {
    throw new Error(`generateExercise: phraseIdx invariant violated for level=${opts.level} key=${opts.key} seed=${opts.seed}`);
  }

  return {
    key: opts.key, mode, tonicMidi: tonic,
    meter: { beats: 4, beatType: 4 }, tempo: 80,
    notes, phrases: numPhrases, difficulty: opts.level,
  };
}

// Raise ♭7̂ → leading tone into a rising resolution, and ♭6̂ ascending to avoid
// an augmented 2nd. Stamps s.midi so emission reads the inflected pitch.
function inflectMinor(line: Slot[], scale: number[], tonic: number): void {
  const relPc = (midi: number) => (((midi - tonic) % 12) + 12) % 12; // tonic-relative
  // Read the pitch a slot will emit (respecting any inflection already applied to
  // earlier slots), so raises are evaluated against the real neighbouring pitches.
  const emitted = line.map((s) => degToMidi(s.deg, scale, tonic));
  for (let i = 0; i < line.length; i++) {
    let midi = emitted[i];
    const pc = relPc(midi);
    const prev = i > 0 ? emitted[i - 1] : undefined;
    const nextMidi = i + 1 < line.length ? emitted[i + 1] : undefined;
    const ascending = nextMidi !== undefined && nextMidi > midi;
    // te → ti (raise 7̂ into the leading tone) when it ascends to do — but never if
    // that would form a tritone with the surrounding notes.
    if (pc === 10 && nextMidi !== undefined && relPc(nextMidi) === 0 && ascending) {
      const raised = midi + 1;
      const tritone = (prev !== undefined && Math.abs(raised - prev) === 6) || Math.abs(nextMidi - raised) === 6;
      if (!tritone) midi = raised;
    } else if (pc === 8 && ascending) {
      // le → la, avoiding the aug 2nd against a raised 7̂ — unless that raise would
      // itself sound a tritone (la against ♭3).
      const raised = midi + 1;
      const tritone = (prev !== undefined && Math.abs(raised - prev) === 6) || (nextMidi !== undefined && Math.abs(nextMidi - raised) === 6);
      if (!tritone) midi = raised;
    }
    emitted[i] = midi;
    line[i].midi = midi;
  }
}

// Carve exactly one unique high point (the climax) in the 2nd half of the line.
// Returns the set of indices that later repair must NOT move (the apex and the
// final cadence tonic), so the climax survives leap-repair.
function enforceSingleClimax(
  line: Slot[], climaxBeatStart: number, scale: number[], tonic: number, N: number,
  floor: number, ceil: number, locked: Set<number>,
): Set<number> {
  const lastIdx = line.length - 1;
  const cursors: number[] = [];
  { let c = 0; for (const s of line) { cursors.push(c); c += s.dur; } }
  const midiOf = (s: Slot) => s.midi ?? degToMidi(s.deg, scale, tonic);
  const nudge = (s: Slot, d: number) => {
    const m = midiOf(s) + d;
    if (m < floor || m > ceil) return false;
    if (s.midi !== undefined) s.midi = m; else s.deg += d;
    return true;
  };
  const lowerBelow = (s: Slot, limit: number) => { let g = 0; while (midiOf(s) >= limit && g++ < 24 && nudge(s, -1)) { /* down */ } };

  // Peak candidate: prefer the highest UNLOCKED interior slot inside the design's
  // climax bar, so it can be raised into a true apex (needed for low 2-bar lines
  // whose only high note would otherwise be the locked opening/cadence do). Fall
  // back to the highest interior slot (a locked arch/cadential apex on longer lines).
  const climaxBeatEnd = climaxBeatStart + 4;
  const inClimaxBar = (i: number) => cursors[i] >= climaxBeatStart && cursors[i] < climaxBeatEnd;
  let peakIdx = -1, peakMidi = -Infinity;
  for (let i = 0; i < lastIdx; i++) {
    if (inClimaxBar(i) && !locked.has(i) && midiOf(line[i]) > peakMidi) { peakMidi = midiOf(line[i]); peakIdx = i; }
  }
  if (peakIdx < 0) for (let i = 0; i < lastIdx; i++) { // any slot in the climax bar
    if (inClimaxBar(i) && midiOf(line[i]) > peakMidi) { peakMidi = midiOf(line[i]); peakIdx = i; }
  }
  if (peakIdx < 0) for (let i = 0; i < lastIdx; i++) { // climax bar collapsed
    if (midiOf(line[i]) > peakMidi) { peakMidi = midiOf(line[i]); peakIdx = i; }
  }
  if (peakIdx < 0) return new Set([lastIdx]);

  // The apex must be the global max — strictly above every other note INCLUDING
  // the cadence tonic (else a low line ties the apex with the final do). Raise it
  // (capped at the ceiling) unless it's a locked cadential note; then lower the
  // offenders below it instead.
  if (!locked.has(peakIdx)) {
    let maxOther = -Infinity;
    for (let i = 0; i < line.length; i++) if (i !== peakIdx) maxOther = Math.max(maxOther, midiOf(line[i]));
    let g = 0;
    while (midiOf(line[peakIdx]) <= maxOther && g++ < 24 && nudge(line[peakIdx], +1)) { /* raise */ }
  }
  peakMidi = midiOf(line[peakIdx]);

  // Every OTHER interior slot strictly below the apex (cadence tonic + locked
  // cadential descent untouched).
  for (let i = 0; i < line.length; i++) {
    if (i === peakIdx || i === lastIdx || locked.has(i)) continue;
    lowerBelow(line[i], peakMidi);
  }

  // Ramp up to and down from a (non-cadential) apex by consecutive scale degrees,
  // so every step near the peak is a single scale step (<a 4th) — in pentatonic the
  // top do' is only reachable stepwise as …sol, la, do', la, sol… never by a jump.
  // Depth 2 covers pentatonic's 3-semitone steps; the locked cadential descent
  // handles its own approach.
  if (!locked.has(peakIdx) && degToMidi(line[peakIdx].deg, scale, tonic) === peakMidi) {
    const depth = 2;
    for (let d = 1; d <= depth; d++) {
      const rampDeg = line[peakIdx].deg - d;
      if (degToMidi(rampDeg, scale, tonic) < floor) break;
      for (const nb of [peakIdx - d, peakIdx + d]) {
        if (nb < 0 || nb >= line.length || nb === lastIdx || locked.has(nb)) continue;
        line[nb].deg = rampDeg;
        line[nb].midi = undefined;
      }
    }
  }
  void N;
  return new Set([peakIdx, lastIdx]);
}

// Repair leaps: no melodic tritone; every leap ≥ a 4th is answered by a contrary
// step ≤2 SEMITONES. Where a ≤2-semitone contrary step does not exist on the scale
// (e.g. pentatonic gaps, or the note after the leap is the immovable cadence tonic),
// the leap itself is SHRUNK below a 4th instead, which removes the obligation.
// Up to 12 passes. Indices in `locked` are immovable (apex / cadence tonic).
function repairMelody(line: Slot[], scale: number[], tonic: number, N: number, locked: Set<number>): void {
  const midiOf = (s: Slot) => s.midi ?? degToMidi(s.deg, scale, tonic);
  // Nearest scale degree to `slot` giving a contrary step of 1–2 semitones from
  // fromMidi in direction wantSign; null if none exists.
  const contraryStepDeg = (slot: Slot, fromMidi: number, wantSign: number): number | null => {
    const base = slot.deg;
    for (const off of [wantSign, 2 * wantSign, -wantSign]) {
      const d = base + off;
      const diff = degToMidi(d, scale, tonic) - fromMidi;
      if (Math.sign(diff) === wantSign && Math.abs(diff) >= 1 && Math.abs(diff) <= 2) return d;
    }
    return null;
  };
  // Move `slot` one scale step toward `towardMidi`.
  const stepToward = (slot: Slot, towardMidi: number) => {
    const dir = Math.sign(towardMidi - midiOf(slot));
    slot.deg += dir === 0 ? 1 : dir;
    slot.midi = undefined;
  };

  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (let i = 1; i < line.length; i++) {
      const cur = midiOf(line[i]);
      const prev = midiOf(line[i - 1]);
      const interval = cur - prev;
      const abs = Math.abs(interval);
      const sign = Math.sign(interval);
      const isLast = i === line.length - 1;

      if (abs === 6) {
        // tritone → break it by nudging the LANDING one scale step against the
        // leap; if the landing is locked/final, fix the (unlocked) approach.
        if (!isLast && !locked.has(i)) { line[i].deg -= sign; line[i].midi = undefined; changed = true; }
        else if (!locked.has(i - 1)) { line[i - 1].deg += sign; line[i - 1].midi = undefined; changed = true; }
        continue;
      }
      if (abs >= 5) {
        const next = line[i + 1];
        const isNextLast = next && i + 1 === line.length - 1;
        // Already resolved? A contrary ≤2 step at i+1 counts even if that note is
        // locked (e.g. the cadential descent's first step resolves the seam leap).
        if (next) {
          const nInt = midiOf(next) - cur;
          if (Math.abs(nInt) >= 1 && Math.abs(nInt) <= 2 && Math.sign(nInt) === -sign) continue;
        }
        // Local dip/spike (both neighbours on the same side of the landing, e.g. a
        // low note wedged before the climax ramp)? Despike the LANDING itself toward
        // its neighbours — moving `next` would only relocate the leap.
        if (next && !locked.has(i)) {
          const nx = midiOf(next);
          if (Math.sign(prev - cur) === Math.sign(nx - cur) && Math.sign(prev - cur) !== 0) {
            const target = (prev + nx) / 2;
            let guard = 0, prevPitch = midiOf(line[i]);
            while ((Math.abs(midiOf(line[i]) - prev) >= 5 || Math.abs(midiOf(line[i]) - nx) >= 5) && guard++ < 12) {
              stepToward(line[i], target);
              if (midiOf(line[i]) === prevPitch) break;
              prevPitch = midiOf(line[i]);
            }
            changed = true;
            continue;
          }
        }
        // Otherwise try to place a resolving contrary step at i+1 (only if movable).
        if (next && !isNextLast && !locked.has(i + 1)) {
          const rd = contraryStepDeg(next, cur, -sign);
          if (rd !== null) { next.deg = rd; next.midi = undefined; changed = true; continue; }
        }
        // No resolving note available → shrink the leap below a 4th by pulling the
        // LANDING toward the approach; but if the landing is a dip/spike wedged
        // between the approach and a fixed higher/lower next note (e.g. a low note
        // right before the climax ramp), aim for the midpoint so shrinking one side
        // doesn't open a leap on the other. If the landing is locked/final, pull the
        // approach toward it instead.
        if (!isLast && !locked.has(i)) {
          const nx = line[i + 1] && !(i + 1 === line.length - 1) ? midiOf(line[i + 1]) : null;
          const wedged = nx !== null && Math.abs(nx - prev) < 5; // both neighbours near each other
          const target = wedged ? (prev + nx) / 2 : prev;
          let guard = 0;
          let prevPitch = midiOf(line[i]);
          while (Math.abs(midiOf(line[i]) - prev) >= 5 && guard++ < 12) {
            stepToward(line[i], target);
            if (midiOf(line[i]) === prevPitch) break; // no progress
            prevPitch = midiOf(line[i]);
          }
          changed = true;
        } else if (!isLast && !locked.has(i - 1)) {
          // Landing is locked (apex/cadential) → pull the approach toward it.
          let guard = 0;
          while (Math.abs(midiOf(line[i]) - midiOf(line[i - 1])) >= 5 && guard++ < 12) stepToward(line[i - 1], midiOf(line[i]));
          changed = true;
        }
        // isLast (leap into the final cadence tonic): left as-is. Such a cadential
        // leap is exempt from the resolution rule (only a tritone into it is fixed
        // above); shrinking it here would break the preceding note's own resolution.
      }
    }
    if (!changed) break;
  }
  void N;
}

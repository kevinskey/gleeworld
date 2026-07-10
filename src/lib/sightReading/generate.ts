import type { ExerciseIR, IRNote } from './ir';
import { midiToSolfege, KEY_TO_MIDI } from './ir';

// Bands A-B. Degrees are semitones above the tonic.
const PENTATONIC = [0, 2, 4, 7, 9];
const DIATONIC   = [0, 2, 4, 5, 7, 9, 11];
const TRIAD      = [0, 4, 7];

interface Level { degrees: number[]; maxLeap: number; bars: number; rhythm: number[]; }
const LEVELS: Record<number, Level> = {
  1: { degrees: PENTATONIC, maxLeap: 4,  bars: 2, rhythm: [1, 1, 1, 1] },
  2: { degrees: PENTATONIC, maxLeap: 5,  bars: 4, rhythm: [1, 1, 2] },
  3: { degrees: DIATONIC,   maxLeap: 7,  bars: 4, rhythm: [1, 1, 2] },
  4: { degrees: DIATONIC,   maxLeap: 7,  bars: 4, rhythm: [0.5, 0.5, 1, 2] },
  5: { degrees: DIATONIC,   maxLeap: 9,  bars: 8, rhythm: [0.5, 0.5, 1, 2] },
  6: { degrees: DIATONIC,   maxLeap: 12, bars: 8, rhythm: [0.5, 0.5, 1, 1.5, 2] },
};

// Deterministic PRNG (mulberry32) — a seed must always yield the same line, so
// a student can be re-sent the exact exercise they were assigned.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isDo(pitch: number, tonicMidi: number): boolean {
  return (((pitch - tonicMidi) % 12) + 12) % 12 === 0;
}

export function generateExercise(opts: { level: number; key: string; seed: number; bars?: number }): ExerciseIR {
  const lv = LEVELS[opts.level] ?? LEVELS[1];
  const tonicMidi = KEY_TO_MIDI[opts.key] ?? 60;
  const rand = rng(opts.seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  // Length: caller-chosen measures override the level's default bar count.
  const beatsTotal = (opts.bars && opts.bars > 0 ? opts.bars : lv.bars) * 4;
  const midis: number[] = [tonicMidi + pick(TRIAD)];   // begin on a triad member
  let windowMin = midis[0];
  let windowMax = midis[0];

  // Every reachable pitch in this level's scale, across a generous octave
  // span, so range/lookahead checks below never have to special-case edges.
  const scalePitches: number[] = [];
  for (const oct of [-24, -12, 0, 12, 24]) {
    for (const deg of lv.degrees) scalePitches.push(tonicMidi + deg + oct);
  }
  scalePitches.sort((a, b) => a - b);

  const withinRange = (cand: number) =>
    Math.max(windowMax, cand) - Math.min(windowMin, cand) <= 12;

  // Does `pitch` have a valid stepwise (<=2 semitone) neighbor in direction
  // `dir` that also respects the level's range and leap ceiling? A leap is
  // only ever offered as a candidate if landing on it leaves a way back —
  // otherwise the line strands itself on an unresolvable note two moves
  // later, which is exactly the bug the brief's version had (see report).
  function hasRecoveryStep(pitch: number, dir: number): boolean {
    return scalePitches.some((p) => {
      const d = p - pitch;
      if (d === 0 || Math.sign(d) !== dir) return false;
      if (Math.abs(d) > 2) return false;
      if (Math.abs(d) > lv.maxLeap) return false;
      return withinRange(p);
    });
  }

  const nearestInDirection = (from: number, dir: number): number | undefined => {
    const inDir = scalePitches.filter((p) => Math.sign(p - from) === dir);
    if (!inDir.length) return undefined;
    return dir > 0 ? Math.min(...inDir) : Math.max(...inDir);
  };

  // Distance (in semitones) from `pitch` to the nearest "do" octave that is
  // still reachable without blowing the running range past an octave. Using
  // plain mod-12 pitch-class distance here was the original bug: once the
  // window has already spanned close to a full octave, the pitch-class-nearest
  // "do" can be an octave that's no longer reachable, while a farther-looking
  // (in mod-12 terms) but actually-reachable "do" gets deprioritized — the
  // cadence search then oscillates between two notes forever, since neither
  // ever resolves to a legal step toward the unreachable target.
  const reachableDoDistance = (pitch: number): number => {
    const targets = [-24, -12, 0, 12, 24]
      .map((k) => tonicMidi + k)
      .filter((t) => Math.max(windowMax, t) - Math.min(windowMin, t) <= 12);
    if (!targets.length) return Infinity;
    return Math.min(...targets.map((t) => Math.abs(t - pitch)));
  };

  const durations: number[] = [];
  let beats = 0;

  // Termination is otherwise empirical (steer-to-tonic + non-empty candidates,
  // observed max 43 iterations) — this cap converts a latent infinite loop into
  // a fast, debuggable failure instead of hanging the caller.
  const MAX_STEPS = 200;
  let steps = 0;

  while (true) {
    steps++;
    if (steps > MAX_STEPS) {
      throw new Error(`generateExercise: no cadence found for level=${opts.level} key=${opts.key} seed=${opts.seed} after ${MAX_STEPS} steps`);
    }

    const dur = pick(lv.rhythm);
    durations.push(dur);
    beats += dur;

    const prev = midis.at(-1)!;
    if (beats >= beatsTotal && isDo(prev, tonicMidi)) break;   // long enough AND ends on do

    const prevLeap = midis.length > 1 ? prev - midis.at(-2)! : 0;
    const mustRecover = Math.abs(prevLeap) >= 5;
    const wantsClose = beats >= beatsTotal;

    const candidates: number[] = [];
    for (const cand of scalePitches) {
      const interval = cand - prev;
      if (interval === 0) continue;
      if (Math.abs(interval) > lv.maxLeap) continue;
      if (!withinRange(cand)) continue;                       // stays within an octave
      if (mustRecover) {
        // After a leap of a 4th or more, the next move must be a step in the
        // opposite direction. This single rule is most of what makes a line singable.
        if (Math.abs(interval) > 2 || Math.sign(interval) !== -Math.sign(prevLeap)) continue;
      } else if (Math.abs(interval) >= 5) {
        // This candidate would itself be a new leap of a 4th or more — only
        // allow it if it can still be resolved by a step back afterward.
        if (!hasRecoveryStep(cand, -Math.sign(interval))) continue;
      }
      candidates.push(cand);
    }

    let chosen: number;
    if (wantsClose) {
      // We've reached the target length: steer toward ending on "do" rather
      // than picking freely.
      const doCandidates = candidates.filter((c) => isDo(c, tonicMidi));
      if (doCandidates.length) {
        chosen = pick(doCandidates);
      } else if (candidates.length) {
        const best = Math.min(...candidates.map(reachableDoDistance));
        chosen = pick(candidates.filter((c) => reachableDoDistance(c) === best));
      } else {
        chosen = nearestInDirection(prev, prevLeap > 0 ? -1 : 1) ?? nearestInDirection(prev, 1) ?? prev;
      }
    } else {
      chosen = candidates.length
        ? pick(candidates)
        : (nearestInDirection(prev, prevLeap > 0 ? -1 : 1) ?? nearestInDirection(prev, 1) ?? prev);
    }

    midis.push(chosen);
    windowMin = Math.min(windowMin, chosen);
    windowMax = Math.max(windowMax, chosen);
  }

  // Trim any overshoot past the nominal bar length off the final note so
  // rhythm stays close to the level's intended duration, without disturbing
  // the pitch invariants established above.
  const overshoot = beats - beatsTotal;
  if (overshoot > 0) {
    const lastIdx = durations.length - 1;
    durations[lastIdx] = Math.max(0.5, durations[lastIdx] - overshoot);
  }

  // The walk terminates only once it naturally lands on "do" at/after the
  // nominal length, so it routinely overshoots beatsTotal. phraseIdx must be
  // derived from the REALIZED length (what we actually emitted), not the
  // nominal one — otherwise a note can land in a phrase index the IR never
  // declares (see review finding: phraseIdx reaching 2 while phrases: 2).
  const realizedBeats = durations.reduce((sum, d) => sum + d, 0);

  let cursor = 0;
  const notes: IRNote[] = midis.map((midi, i) => {
    const durationBeats = durations[i] ?? 1;
    const beatPos = cursor;
    const note: IRNote = {
      midi, beatPos, durationBeats,
      solfege: midiToSolfege(midi, tonicMidi),
      phraseIdx: beatPos < realizedBeats / 2 ? 0 : 1,
    };
    cursor += durationBeats;
    return note;
  });

  // Loud failure beats a silently malformed exercise: every note must land in
  // one of the two declared phrases, and the last note must exactly reach the
  // realized total (no dangling overshoot the IR doesn't account for).
  const maxPhraseIdx = Math.max(...notes.map((n) => n.phraseIdx));
  const lastNote = notes.at(-1)!;
  if (maxPhraseIdx >= 2) {
    throw new Error(`generateExercise: phraseIdx invariant violated (max=${maxPhraseIdx}) for level=${opts.level} key=${opts.key} seed=${opts.seed}`);
  }
  if (lastNote.beatPos + lastNote.durationBeats !== realizedBeats) {
    throw new Error(`generateExercise: realized-length invariant violated for level=${opts.level} key=${opts.key} seed=${opts.seed}`);
  }

  return {
    key: opts.key, mode: 'major', tonicMidi,
    meter: { beats: 4, beatType: 4 }, tempo: 80,
    notes, phrases: 2, difficulty: opts.level,
  };
}

import type { ExerciseIR, IRNote } from './ir';
import { midiToSolfege, KEY_TO_MIDI } from './ir';

// Bands A-B. Degrees are semitones above the tonic.
const PENTATONIC = [0, 2, 4, 7, 9];
const DIATONIC   = [0, 2, 4, 5, 7, 9, 11];
const TRIAD      = [0, 4, 7];

interface Level { degrees: number[]; maxLeap: number; bars: number; rhythmCells: number[][]; }
const LEVELS: Record<number, Level> = {
  1: { degrees: PENTATONIC, maxLeap: 4,  bars: 2, rhythmCells: [[1]] },
  2: { degrees: PENTATONIC, maxLeap: 5,  bars: 4, rhythmCells: [[1], [2]] },
  3: { degrees: DIATONIC,   maxLeap: 7,  bars: 4, rhythmCells: [[1], [2]] },
  4: { degrees: DIATONIC,   maxLeap: 7,  bars: 4, rhythmCells: [[0.5, 0.5], [1], [2]] },
  5: { degrees: DIATONIC,   maxLeap: 9,  bars: 8, rhythmCells: [[0.5, 0.5], [1], [2]] },
  6: { degrees: DIATONIC,   maxLeap: 12, bars: 8, rhythmCells: [[0.5, 0.5], [1], [1.5, 0.5], [2]] },
};
const cellBeats = (c: number[]) => c.reduce((s, d) => s + d, 0);

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

  // Length: caller-chosen measures override the level's default bar count. Bars are
  // always whole 4/4 measures, so beatsTotal is always an integer.
  const bars = (opts.bars && opts.bars > 0 ? opts.bars : lv.bars);
  const beatsTotal = bars * 4;
  const CADENCE_BEATS = beatsTotal >= 8 ? 4 : 2; // reserve the final measure for a downbeat tonic cadence
  const contentTotal = beatsTotal - CADENCE_BEATS;

  // Absolute ambitus around the tonic so the line stays readable/on-staff, instead of
  // drifting arbitrarily far from a purely relative octave window.
  const AMBITUS_LO = tonicMidi - 5;
  const AMBITUS_HI = tonicMidi + 12;
  const scalePitches: number[] = [];
  for (const oct of [-12, 0, 12]) {
    for (const deg of lv.degrees) {
      const p = tonicMidi + deg + oct;
      if (p >= AMBITUS_LO && p <= AMBITUS_HI) scalePitches.push(p);
    }
  }
  scalePitches.sort((a, b) => a - b);

  let windowMin: number, windowMax: number;
  const withinRange = (cand: number) =>
    Math.max(windowMax, cand) - Math.min(windowMin, cand) <= 12;

  // Does `pitch` have a valid stepwise (<=2 semitone) neighbor in direction
  // `dir` that also respects the level's range and leap ceiling? A leap is
  // only ever offered as a candidate if landing on it leaves a way back —
  // otherwise the line strands itself on an unresolvable note two moves later.
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

  function chooseNext(prev: number, prevLeap: number, towardTonic: boolean): number {
    const mustRecover = Math.abs(prevLeap) >= 5;
    const candidates: number[] = [];
    for (const cand of scalePitches) {
      const interval = cand - prev;
      if (interval === 0) continue;
      if (Math.abs(interval) > lv.maxLeap) continue;
      if (!withinRange(cand)) continue;
      if (mustRecover) {
        // After a leap of a 4th or more, the next move must be a step in the
        // opposite direction. This single rule is most of what makes a line singable.
        if (Math.abs(interval) > 2 || Math.sign(interval) !== -Math.sign(prevLeap)) continue;
      } else if (Math.abs(interval) >= 5) {
        // This candidate would itself be a new leap of a 4th or more — only
        // allow it if it can still be resolved by a step back afterward. Once we're
        // in the toward-tonic window (the last beats of content before the reserved
        // cadence measure), there's no note left to carry that resolution, so a fresh
        // unresolved leap here would land on the cadence tonic without ever
        // resolving — reject it outright instead of only checking reachability.
        if (towardTonic) continue;
        if (!hasRecoveryStep(cand, -Math.sign(interval))) continue;
      }
      candidates.push(cand);
    }
    if (!candidates.length) {
      return nearestInDirection(prev, prevLeap > 0 ? -1 : 1) ?? nearestInDirection(prev, 1) ?? prev;
    }
    if (towardTonic) {
      // Steer toward ending near "do" rather than picking freely, without hard-requiring
      // a "do" landing here — the reserved cadence measure guarantees the final note is do.
      const stepToDo = candidates.filter((c) =>
        scalePitches.some((t) => isDo(t, tonicMidi) && Math.abs(t - c) > 0 && Math.abs(t - c) <= 2));
      if (stepToDo.length) return pick(stepToDo);
    }
    return pick(candidates);
  }

  const seq: { midi: number; dur: number }[] = [];
  let cur = tonicMidi + pick(TRIAD); // begin on a triad member
  windowMin = windowMax = cur;
  let prevMidi = cur;
  let beats = 0;
  while (beats < contentTotal) {
    const remaining = contentTotal - beats;
    const cell = pick(lv.rhythmCells.filter((c) => cellBeats(c) <= remaining)); // a [1] cell always fits
    for (const dur of cell) {
      seq.push({ midi: cur, dur });
      beats += dur;
      if (beats >= contentTotal) break;
      const prevLeap = cur - prevMidi; prevMidi = cur;
      cur = chooseNext(cur, prevLeap, beats >= contentTotal - 2);
      windowMin = Math.min(windowMin, cur); windowMax = Math.max(windowMax, cur);
    }
  }
  // Reserve the final measure for a downbeat tonic cadence, landing on whichever "do"
  // octave is closest to where the content line ended up.
  const dos = scalePitches.filter((p) => isDo(p, tonicMidi));
  const finalTonic = dos.reduce((best, p) => (Math.abs(p - cur) < Math.abs(best - cur) ? p : best), dos[0]);
  seq.push({ midi: finalTonic, dur: CADENCE_BEATS });

  let cursor = 0;
  const notes: IRNote[] = seq.map(({ midi, dur }) => {
    const note: IRNote = {
      midi, beatPos: cursor, durationBeats: dur,
      solfege: midiToSolfege(midi, tonicMidi),
      phraseIdx: cursor < beatsTotal / 2 ? 0 : 1,
    };
    cursor += dur;
    return note;
  });

  // Loud failure beats a silently malformed exercise: every note must land in
  // one of the two declared phrases, and the last note must exactly reach the
  // nominal total (whole bars, no overshoot/undershoot).
  const maxPhraseIdx = Math.max(...notes.map((n) => n.phraseIdx));
  const lastNote = notes.at(-1)!;
  if (maxPhraseIdx >= 2) {
    throw new Error(`generateExercise: phraseIdx invariant violated (max=${maxPhraseIdx}) for level=${opts.level} key=${opts.key} seed=${opts.seed}`);
  }
  if (lastNote.beatPos + lastNote.durationBeats !== beatsTotal) {
    throw new Error(`generateExercise: realized-length invariant violated for level=${opts.level} key=${opts.key} seed=${opts.seed}`);
  }

  return {
    key: opts.key, mode: 'major', tonicMidi,
    meter: { beats: 4, beatType: 4 }, tempo: 80,
    notes, phrases: 2, difficulty: opts.level,
  };
}

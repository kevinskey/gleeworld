// scripts/ssat/engine.mjs
// Deterministic melody/rhythm engine for the Sight Singing & Aural Skills template
// courses. Mirrors src/lib/sightReading/ir.ts conventions (solfège table, key map,
// durations in beatType units). Node-only — never imported by app code.

export const SOLFEGE = ['do', 'ra', 're', 'me', 'mi', 'fa', 'fi', 'sol', 'le', 'la', 'te', 'ti'];
export const KEY_TO_MIDI = { C: 60, D: 62, Eb: 63, E: 64, F: 65, G: 67, A: 69, Bb: 70 };
export const midiToSolfege = (midi, tonicMidi) => SOLFEGE[(((midi - tonicMidi) % 12) + 12) % 12];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  melodic: [0, 2, 3, 5, 7, 9, 11],
};
const DUR_WHITELIST = { 4: [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4], 8: [0.5, 1, 1.5, 2, 3, 4, 6], 2: [0.5, 1, 1.5, 2] };

export function note(midi, beatPos, durationBeats, tonicMidi) {
  return { midi, beatPos, durationBeats, solfege: midiToSolfege(midi, tonicMidi), phraseIdx: 0 };
}

export function irFromDegrees({ key, mode, tempo, meter, degrees, durations, octave = 0 }) {
  const tonicMidi = KEY_TO_MIDI[key] + octave * 12;
  let pos = 0;
  const notes = degrees.map((deg, i) => {
    const n = note(tonicMidi + deg, pos, durations[i], tonicMidi);
    pos += durations[i];
    return n;
  });
  return { key, mode, tonicMidi, meter, tempo, notes, phrases: 1, difficulty: 1 };
}

// Fill `bars` measures exactly from palette cells. A cell is an array of durations,
// each optionally an object { d, rest: true } — plain numbers are sounding notes.
export function makeRhythm({ meter, bars, palette, seed }) {
  const rng = mulberry32(seed);
  const cellDur = (cell) => cell.reduce((s, x) => s + (typeof x === 'number' ? x : x.d), 0);
  const cells = [];
  for (let bar = 0; bar < bars; bar++) {
    let left = meter.beats;
    while (left > 1e-6) {
      const fits = palette.filter((c) => cellDur(c) <= left + 1e-6);
      if (!fits.length) throw new Error(`makeRhythm: no palette cell fits remaining ${left} beats — include a filler cell`);
      const cell = pick(rng, fits);
      for (const x of cell) cells.push(typeof x === 'number' ? { d: x, rest: false } : { d: x.d, rest: !!x.rest });
      left -= cellDur(cell);
    }
  }
  return { cells };
}

export function makeMelody(spec) {
  const { key, mode, meter, tempo, bars, seed, range, leaps = [], rhythmPalette,
          start = [0, 4, 7], chromatic, endOnTonic = true, scale } = spec;
  const rng = mulberry32(seed);
  const tonicMidi = KEY_TO_MIDI[key];
  const scaleSemis = SCALES[scale ?? (mode === 'minor' ? 'natural' : 'major')];

  // All scale pitches inside the range, ascending; melody indexes into this ladder.
  const ladder = [];
  for (let m = range[0]; m <= range[1]; m++) {
    if (scaleSemis.includes((((m - tonicMidi) % 12) + 12) % 12)) ladder.push(m);
  }
  const idxOfNearest = (midi) => {
    let best = 0;
    for (let i = 1; i < ladder.length; i++) if (Math.abs(ladder[i] - midi) < Math.abs(ladder[best] - midi)) best = i;
    return best;
  };

  const { cells } = makeRhythm({ meter, bars, palette: rhythmPalette, seed: seed ^ 0x9e3779b9 });
  const sounding = cells.filter((c) => !c.rest).length;

  // Walk the ladder: steps by default, allowed leaps sometimes, leap recovery by
  // contrary step, hard range bounds, cadence re/ti → do.
  const startMidis = start.map((deg) => tonicMidi + deg).filter((m) => m >= range[0] && m <= range[1]);
  let idx = idxOfNearest(pick(rng, startMidis.length ? startMidis : [tonicMidi]));
  const pitches = [ladder[idx]];
  let lastWasLeap = false;
  let lastDir = 1;
  for (let i = 1; i < sounding; i++) {
    const candidates = [];
    for (let j = 0; j < ladder.length; j++) {
      const iv = Math.abs(ladder[j] - ladder[idx]);
      const isStep = j !== idx && Math.abs(j - idx) === 1;
      // A scale-degree-adjacent move is always a step (rule 1), even if its
      // semitone size happens to coincide with an allowed leap interval — e.g.
      // harmonic minor's augmented 2nd (le→ti) is 3 semitones, which specs often
      // also list as an allowed leap. Without the `!isStep` guard, that candidate
      // gets double-classified as a leap and wrongly excluded during leap
      // recovery (`isLeap && lastWasLeap`), starving the candidate pool and
      // forcing the unconstrained fallback below to fire.
      const isLeap = !isStep && iv > 2 && leaps.includes(iv);
      const isRepeat = j === idx;
      if (!isStep && !isLeap && !isRepeat) continue;
      if (isLeap && lastWasLeap) continue;
      if (lastWasLeap) { // recovery: contrary step only
        if (!isStep || Math.sign(j - idx) === lastDir) continue;
      }
      // weights: steps 5, repeats 1, leaps 2
      const w = isStep ? 5 : isLeap ? 2 : 1;
      for (let k = 0; k < w; k++) candidates.push(j);
    }
    const next = candidates.length ? pick(rng, candidates) : Math.max(0, idx - 1);
    // Leap-ness is ladder-index adjacency, same as the isLeap classification
    // above: a scale-degree-adjacent move is always a step and must never set
    // lastWasLeap, even when its semitone size exceeds 2 (harmonic minor's
    // le→ti augmented 2nd is 3 semitones but still a step) — otherwise a plain
    // step spuriously forces leap-recovery on the following move.
    lastWasLeap = Math.abs(next - idx) > 1;
    lastDir = Math.sign(next - idx) || lastDir;
    idx = next;
    pitches.push(ladder[idx]);
  }

  if (endOnTonic && sounding >= 3) {
    // Nearest tonic to the walk's end, approached from re (above) or ti (below).
    const tonics = ladder.filter((m) => (((m - tonicMidi) % 12) + 12) % 12 === 0);
    const finalDo = tonics.reduce((a, b) => (Math.abs(b - pitches[sounding - 1]) < Math.abs(a - pitches[sounding - 1]) ? b : a));
    const doIdx = ladder.indexOf(finalDo);
    const approachIdx = ladder[doIdx + 1] !== undefined ? doIdx + 1 : doIdx - 1; // re above (or ti below at ladder top)
    pitches[sounding - 1] = finalDo;
    pitches[sounding - 2] = ladder[approachIdx];

    // The random walk had no idea it would be forced to land here, so the note
    // right before this forced pair can be an arbitrary distance away in ladder
    // space — overwriting only the last two notes can silently produce a jump
    // bigger than any allowed leap (rule 2 violation). Glide the tail backward
    // one ladder-step at a time until it reconnects with the walk's original
    // path, so every note this touches differs from its neighbor by at most one
    // scale degree (always a valid "step", never a leap).
    let cursorIdx = approachIdx;
    for (let i = sounding - 3; i >= 0; i--) {
      const curIdx = ladder.indexOf(pitches[i]);
      const gap = cursorIdx - curIdx;
      if (Math.abs(gap) <= 1) {
        // Ladder-adjacent, so the outgoing move (i -> i+1) is a step — but if the
        // walk's original move INTO pitches[i] was a leap, that leap's mandated
        // recovery is exactly this outgoing move (rule 2: leap always followed by
        // a contrary-direction step). Only stop here if that recovery still holds;
        // otherwise the leap's recovery step was the very thing we just
        // overwrote, so keep gliding backward through the leap itself, erasing it.
        // Ladder-index adjacency here too (see lastWasLeap above): an adjacent
        // scale-degree move is a step even when it spans 3 semitones.
        const prevIdxInLadder = i > 0 ? ladder.indexOf(pitches[i - 1]) : -1;
        const incomingWasLeap = i > 0 && Math.abs(curIdx - prevIdxInLadder) > 1;
        const leapDir = incomingWasLeap ? Math.sign(curIdx - prevIdxInLadder) : 0;
        if (!incomingWasLeap || (gap !== 0 && Math.sign(gap) === -leapDir)) break; // glide done
        cursorIdx += -leapDir; // step away from the leap direction to actively erase it
      } else {
        cursorIdx += gap > 0 ? -1 : 1;
      }
      pitches[i] = ladder[cursorIdx];
    }
  }

  // Lay pitches onto the rhythm.
  const notes = [];
  let pos = 0, p = 0;
  for (const c of cells) {
    if (!c.rest) notes.push(note(pitches[p++], pos, c.d, tonicMidi));
    pos += c.d;
  }
  let ir = { key, mode, tonicMidi, meter, tempo, notes, phrases: Math.max(1, Math.round(bars / 4)), difficulty: 1 };

  if (chromatic?.count) ir = insertChromatics(ir, chromatic.count, rng);
  assertValidExercise(ir);
  return ir;
}

// Split whole-step moves into two halves with a chromatic passing tone between.
function insertChromatics(ir, count, rng) {
  const whitelist = DUR_WHITELIST[ir.meter.beatType] ?? DUR_WHITELIST[4];
  const notes = ir.notes.map((n) => ({ ...n }));
  const sites = [];
  for (let i = 0; i < notes.length - 1; i++) {
    const iv = notes[i + 1].midi - notes[i].midi;
    const half = notes[i].durationBeats / 2;
    const sameBar = Math.floor(notes[i].beatPos / ir.meter.beats)
      === Math.floor((notes[i].beatPos + notes[i].durationBeats - 1e-6) / ir.meter.beats);
    if (Math.abs(iv) === 2 && whitelist.includes(half) && sameBar) sites.push(i);
  }
  if (sites.length < count) throw new Error(`insertChromatics: only ${sites.length} sites for ${count} chromatics — lengthen the melody or relax the rhythm`);
  // deterministic pick: shuffle sites with rng, take `count`, apply right-to-left
  const shuffled = [...sites];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const chosen = shuffled.slice(0, count).sort((a, b) => b - a);
  for (const i of chosen) {
    const n = notes[i];
    const dir = Math.sign(notes[i + 1].midi - n.midi);
    const half = n.durationBeats / 2;
    const passing = note(n.midi + dir, n.beatPos + half, half, ir.tonicMidi);
    n.durationBeats = half;
    notes.splice(i + 1, 0, passing);
  }
  return { ...ir, notes };
}

export function concatIrs(irs) {
  const first = irs[0];
  let offset = 0;
  const notes = [];
  for (const ir of irs) {
    for (const n of ir.notes) notes.push({ ...n, beatPos: n.beatPos + offset });
    offset += ir.notes.reduce((s, n) => Math.max(s, n.beatPos + n.durationBeats), 0);
  }
  return { ...first, notes };
}

export function assertValidExercise(ir) {
  const whitelist = DUR_WHITELIST[ir.meter.beatType];
  if (!whitelist) throw new Error(`no duration whitelist for beatType ${ir.meter.beatType}`);
  let cursor = 0;
  for (const n of ir.notes) {
    if (n.beatPos < cursor - 1e-6) throw new Error(`overlap/unsorted at beat ${n.beatPos}`);
    if (!whitelist.some((d) => Math.abs(d - n.durationBeats) < 1e-6)) {
      throw new Error(`duration ${n.durationBeats} not renderable (beatType ${ir.meter.beatType})`);
    }
    const startBar = Math.floor((n.beatPos + 1e-6) / ir.meter.beats);
    const endBar = Math.floor((n.beatPos + n.durationBeats - 1e-6) / ir.meter.beats);
    if (startBar !== endBar) throw new Error(`note at beat ${n.beatPos} crosses a barline`);
    if (n.midi < 36 || n.midi > 96) throw new Error(`midi ${n.midi} out of range`);
    cursor = n.beatPos + n.durationBeats;
  }
}

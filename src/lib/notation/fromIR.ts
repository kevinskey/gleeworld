import { EditorScore, EditorElement, noteOf, restOf, Pitch } from './model';
import { BaseDur, DIVISIONS, dottedTicks, ticksToDur } from './duration';
import type { ExerciseIR } from '@/lib/sightReading/ir';

// Render a sight-reading ExerciseIR (midi + beats) as real notation. Spell each MIDI
// note by the key's accidental direction (sharps for sharp keys, flats for flat keys),
// derive durations from beats, and fill gaps between notes with rests.

const KEY_FIFTHS: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
  F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};
// A minor key's signature is its relative major's. `ir.key` names the minor
// tonic (e.g. 'A' means A minor), so map the tonic name to the relative-major
// fifths, else fall back to the major table.
const MINOR_FIFTHS: Record<string, number> = {
  A: 0, E: 1, B: 2, 'F#': 3, 'C#': 4, 'G#': 5, 'D#': 6, 'A#': 7,
  D: -1, G: -2, C: -3, F: -4, Bb: -5, Eb: -6, Ab: -7,
};
// pitch-class → [step, alter]. Both tables spell naturals identically; they differ only
// on the five black keys (sharp vs flat spelling).
const SHARP: Array<[Pitch['step'], number]> = [
  ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
];
const FLAT: Array<[Pitch['step'], number]> = [
  ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0], ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
];

function spellMidi(midi: number, useFlats: boolean): Pitch {
  const pc = ((midi % 12) + 12) % 12;
  const [step, alter] = (useFlats ? FLAT : SHARP)[pc];
  // Both tables are chosen so CHROMA(step)+alter === pc, so (midi - pc) is a whole octave.
  const octave = (midi - pc) / 12 - 1;
  return { step, octave, alter };
}

// Every (base, dots) duration, largest tick value first. Used to greedily fill a
// rest gap with the fewest, largest glyphs (e.g. an 8-beat 4/4 gap → two wholes,
// not a dropped rest — ticksToDur only matches a gap that is itself one glyph).
const ALL_RESTS: Array<{ base: BaseDur; dots: number; ticks: number }> = (
  ['whole', 'half', 'quarter', 'eighth', '16th', '32nd'] as BaseDur[]
).flatMap((base) => [0, 1, 2].map((dots) => ({ base, dots, ticks: dottedTicks(base, dots) })))
  .sort((a, b) => b.ticks - a.ticks);

// Fill the gap [fromBeat, toBeat) with rests, splitting at barlines (multiples of
// `meterBeats`, in the same beat-position units as ir.notes) so no single rest
// glyph ever implies a duration that crosses a bar — then within each bar chunk,
// greedily emit the largest ticksToDur-expressible rest until the chunk is filled.
function fillGapRests(fromBeat: number, toBeat: number, meterBeats: number, ticksPerBeat: number): EditorElement[] {
  const EPS = 1e-6;
  const elements: EditorElement[] = [];
  let p = fromBeat;
  while (toBeat - p > EPS) {
    const barIndex = Math.floor((p + EPS) / meterBeats);
    const nextBarline = (barIndex + 1) * meterBeats;
    const chunkEnd = Math.min(nextBarline, toBeat);
    let remainingTicks = Math.round((chunkEnd - p) * ticksPerBeat);
    while (remainingTicks > 0) {
      const fit = ALL_RESTS.find((d) => d.ticks <= remainingTicks);
      if (!fit) break; // remainder smaller than the shortest expressible rest — drop it
      elements.push(restOf(fit.base, fit.dots));
      remainingTicks -= fit.ticks;
    }
    p = chunkEnd;
  }
  return elements;
}

export function irToEditorScore(ir: ExerciseIR): EditorScore {
  const keyFifths = (ir.mode === 'minor' ? MINOR_FIFTHS[ir.key] : KEY_FIFTHS[ir.key]) ?? 0;
  const useFlats = keyFifths < 0;
  const ticksPerBeat = (DIVISIONS * 4) / ir.meter.beatType;
  const elements: EditorElement[] = [];
  let cursor = 0; // beat position filled so far
  const notes = [...ir.notes].sort((a, b) => a.beatPos - b.beatPos);

  // Pick the clef from the median pitch of the line so a low melody doesn't sit in
  // heavy ledger lines above a treble staff.
  const mids = ir.notes.map((n) => n.midi).sort((a, b) => a - b);
  const median = mids.length ? mids[Math.floor(mids.length / 2)] : 60;
  const clef: EditorScore['clef'] = median < 57 ? 'bass' : 'treble'; // below A3 → bass

  for (const n of notes) {
    if (n.beatPos > cursor + 1e-6) {
      elements.push(...fillGapRests(cursor, n.beatPos, ir.meter.beats, ticksPerBeat));
    }
    const dur = ticksToDur(Math.round(n.durationBeats * ticksPerBeat));
    if (dur) elements.push(noteOf(spellMidi(n.midi, useFlats), dur.base, dur.dots));
    cursor = n.beatPos + n.durationBeats;
  }

  return {
    title: '',
    keyFifths,
    mode: ir.mode === 'minor' ? 'minor' : 'major',
    timeSig: { beats: ir.meter.beats, beatType: ir.meter.beatType },
    clef,
    tempo: ir.tempo,
    elements,
  };
}

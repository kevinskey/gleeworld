import { EditorScore, EditorElement, noteOf, restOf, Pitch } from './model';
import { DIVISIONS, ticksToDur } from './duration';
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
      const rest = ticksToDur(Math.round((n.beatPos - cursor) * ticksPerBeat));
      if (rest) elements.push(restOf(rest.base, rest.dots));
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

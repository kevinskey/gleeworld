import { DIVISIONS } from './duration';
import { EditorScore, elementTicks } from './model';
import type { ExerciseIR, IRNote } from '@/lib/sightReading/ir';
import { midiToSolfege } from '@/lib/sightReading/ir';

const CHROMA: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
const FIFTHS_TONIC: Record<number, number> = { 0:60, 1:67, 2:62, 3:69, 4:64, 5:71, [-1]:65, [-2]:70, [-3]:63, [-4]:68 };
const FIFTHS_KEY: Record<number, string> = { 0:'C', 1:'G', 2:'D', 3:'A', 4:'E', 5:'B', [-1]:'F', [-2]:'Bb', [-3]:'Eb', [-4]:'Ab' };

export function editorScoreToIR(score: EditorScore): ExerciseIR | null {
  const tonicMidi = FIFTHS_TONIC[score.keyFifths] ?? 60;
  const notes: IRNote[] = [];
  let beatPos = 0;
  const ticksPerBeat = DIVISIONS * 4 / score.timeSig.beatType;

  for (const el of score.elements) {
    const beats = elementTicks(el) / ticksPerBeat;
    if (el.kind === 'note') {
      const midi = (el.pitch.octave + 1) * 12 + CHROMA[el.pitch.step] + el.pitch.alter;
      const prev = notes[notes.length - 1];
      if (el.tie === 'stop' && prev && prev.midi === midi) {
        prev.durationBeats += beats;
      } else {
        notes.push({ midi, beatPos, durationBeats: beats, solfege: midiToSolfege(midi, tonicMidi), phraseIdx: 0 });
      }
    }
    beatPos += beats;
  }
  if (notes.length === 0) return null;

  return {
    key: FIFTHS_KEY[score.keyFifths] ?? 'C', mode: score.mode, tonicMidi,
    meter: { beats: score.timeSig.beats, beatType: score.timeSig.beatType },
    tempo: score.tempo,
    notes, phrases: 1, difficulty: 1,
  };
}

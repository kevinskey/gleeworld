import { hzToMidi } from './pitch';
import type { ParsedScore } from './musicXMLParser';

export interface IRNote { midi: number; beatPos: number; durationBeats: number; solfege: string; phraseIdx: number; }
export interface ExerciseIR {
  key: string; mode: 'major' | 'minor'; tonicMidi: number;
  meter: { beats: number; beatType: number }; tempo: number;
  notes: IRNote[]; phrases: number; difficulty: number;
}

// Movable-do. Index = semitones above the tonic, octave-reduced.
const SOLFEGE = ['do','ra','re','me','mi','fa','fi','sol','le','la','te','ti'];

export function midiToSolfege(midi: number, tonicMidi: number): string {
  const degree = (((midi - tonicMidi) % 12) + 12) % 12;
  return SOLFEGE[degree];
}

export function parsedScoreToIR(score: ParsedScore, key: string, mode: 'major' | 'minor'): ExerciseIR {
  const secondsPerBeat = 60 / score.tempo;
  const flat = score.measures.flatMap((m) => m.notes);
  const tonicMidi = flat.length ? Math.round(hzToMidi(flat[0].frequency)) : 60;

  const notes: IRNote[] = flat.map((n) => ({
    midi: Math.round(hzToMidi(n.frequency)),
    beatPos: n.startTime / secondsPerBeat,
    durationBeats: n.duration / secondsPerBeat,
    solfege: midiToSolfege(Math.round(hzToMidi(n.frequency)), tonicMidi),
    phraseIdx: 0,
  }));

  return {
    key, mode, tonicMidi,
    meter: score.timeSignature,
    tempo: score.tempo,
    notes,
    phrases: 1,
    difficulty: 1,
  };
}

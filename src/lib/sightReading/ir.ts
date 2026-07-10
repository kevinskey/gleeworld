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

// MIDI note number for the tonic of each key the app offers (in the octave beginning at C4/60).
const KEY_TO_MIDI: Record<string, number> = {
  C: 60, D: 62, Eb: 63, E: 64, F: 65, G: 67, A: 69, Bb: 70,
};

export function midiToSolfege(midi: number, tonicMidi: number): string {
  const degree = (((midi - tonicMidi) % 12) + 12) % 12;
  return SOLFEGE[degree];
}

export function parsedScoreToIR(score: ParsedScore, key: string, mode: 'major' | 'minor'): ExerciseIR {
  const secondsPerBeat = 60 / score.tempo;
  const flat = score.measures.flatMap((m) => m.notes);
  // The tonic must come from the declared key, not the first note: a teacher-uploaded
  // MusicXML score may open on a pickup note or any other non-tonic scale degree, and
  // trusting the first note would silently mislabel every solfège syllable in the piece.
  const tonicMidi = KEY_TO_MIDI[key] ?? 60;

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

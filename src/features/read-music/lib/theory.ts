export type MajorKey =
  | "C" | "G" | "D" | "A" | "E" | "B" | "F#" | "C#"
  | "F" | "Bb" | "Eb" | "Ab" | "Db" | "Gb" | "Cb";

export const KEYS_BASIC: MajorKey[] = ["C", "G", "D", "F", "Bb"];
export const KEYS_FULL: MajorKey[] = ["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"];

export const RELATIVE_MINOR: Record<MajorKey, string> = {
  C: "a", G: "e", D: "b", A: "f#", E: "c#", B: "g#", "F#": "d#", "C#": "a#",
  F: "d", Bb: "g", Eb: "c", Ab: "f", Db: "bb", Gb: "eb", Cb: "ab",
};

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

export const INTERVAL_BASIC = [
  { value: "2", label: "2nd", semitones: [1, 2] },
  { value: "3", label: "3rd", semitones: [3, 4] },
  { value: "4", label: "4th", semitones: [5] },
  { value: "5", label: "5th", semitones: [7] },
] as const;

export const INTERVAL_FULL = [
  { value: "m2", label: "Minor 2nd", semitones: 1 },
  { value: "M2", label: "Major 2nd", semitones: 2 },
  { value: "m3", label: "Minor 3rd", semitones: 3 },
  { value: "M3", label: "Major 3rd", semitones: 4 },
  { value: "P4", label: "Perfect 4th", semitones: 5 },
  { value: "TT", label: "Tritone", semitones: 6 },
  { value: "P5", label: "Perfect 5th", semitones: 7 },
  { value: "m6", label: "Minor 6th", semitones: 8 },
  { value: "M6", label: "Major 6th", semitones: 9 },
  { value: "m7", label: "Minor 7th", semitones: 10 },
  { value: "M7", label: "Major 7th", semitones: 11 },
  { value: "P8", label: "Octave", semitones: 12 },
] as const;

export const TRIAD_QUALITIES = [
  { value: "M", label: "Major",      intervals: [0, 4, 7] },
  { value: "m", label: "Minor",      intervals: [0, 3, 7] },
  { value: "d", label: "Diminished", intervals: [0, 3, 6] },
  { value: "A", label: "Augmented",  intervals: [0, 4, 8] },
] as const;

export const MODES = [
  { value: "ionian",     label: "Ionian",     pattern: [2, 2, 1, 2, 2, 2, 1] },
  { value: "dorian",     label: "Dorian",     pattern: [2, 1, 2, 2, 2, 1, 2] },
  { value: "phrygian",   label: "Phrygian",   pattern: [1, 2, 2, 2, 1, 2, 2] },
  { value: "lydian",     label: "Lydian",     pattern: [2, 2, 2, 1, 2, 2, 1] },
  { value: "mixolydian", label: "Mixolydian", pattern: [2, 2, 1, 2, 2, 1, 2] },
  { value: "aeolian",    label: "Aeolian",    pattern: [2, 1, 2, 2, 1, 2, 2] },
  { value: "locrian",    label: "Locrian",    pattern: [1, 2, 2, 1, 2, 2, 2] },
] as const;

export const ROMAN_MAJOR = [
  { value: "I",   label: "I",   degree: 0, quality: "M" },
  { value: "ii",  label: "ii",  degree: 2, quality: "m" },
  { value: "iii", label: "iii", degree: 4, quality: "m" },
  { value: "IV",  label: "IV",  degree: 5, quality: "M" },
  { value: "V",   label: "V",   degree: 7, quality: "M" },
  { value: "vi",  label: "vi",  degree: 9, quality: "m" },
  { value: "vii°",label: "vii°",degree: 11, quality: "d" },
] as const;

export const FIGURED_BASS_INVERSIONS = [
  { value: "root", label: "Root position", figure: "" },
  { value: "1st",  label: "1st inversion", figure: "6" },
  { value: "2nd",  label: "2nd inversion", figure: "6/4" },
] as const;

const LETTER_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteToMidi(noteKey: string): number {
  const m = noteKey.match(/^([a-gA-G])([#b]*)\/(-?\d+)$/);
  if (!m) return 60;
  const letter = m[1].toUpperCase();
  const acc = m[2];
  const oct = parseInt(m[3], 10);
  let s = LETTER_SEMITONES[letter];
  for (const ch of acc) {
    if (ch === "#") s += 1;
    if (ch === "b") s -= 1;
  }
  return (oct + 1) * 12 + s;
}

export function transposeUp(noteKey: string, semitones: number, preferFlats = false): string {
  const midi = noteToMidi(noteKey) + semitones;
  const oct = Math.floor(midi / 12) - 1;
  const pc = ((midi % 12) + 12) % 12;
  const name = (preferFlats ? FLAT_NAMES : NOTE_NAMES)[pc];
  return `${name.toLowerCase()}/${oct}`;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

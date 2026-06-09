import type { Clef } from "../components/Staff";

export const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type Letter = (typeof NOTE_LETTERS)[number];

export type NoteEntry = { letter: Letter; key: string };

export const POOLS: Record<Clef, NoteEntry[]> = {
  treble: [
    { letter: "E", key: "e/4" }, { letter: "F", key: "f/4" }, { letter: "G", key: "g/4" },
    { letter: "A", key: "a/4" }, { letter: "B", key: "b/4" }, { letter: "C", key: "c/5" },
    { letter: "D", key: "d/5" }, { letter: "E", key: "e/5" }, { letter: "F", key: "f/5" },
  ],
  bass: [
    { letter: "G", key: "g/2" }, { letter: "A", key: "a/2" }, { letter: "B", key: "b/2" },
    { letter: "C", key: "c/3" }, { letter: "D", key: "d/3" }, { letter: "E", key: "e/3" },
    { letter: "F", key: "f/3" }, { letter: "G", key: "g/3" }, { letter: "A", key: "a/3" },
  ],
  alto: [
    { letter: "F", key: "f/3" }, { letter: "G", key: "g/3" }, { letter: "A", key: "a/3" },
    { letter: "B", key: "b/3" }, { letter: "C", key: "c/4" }, { letter: "D", key: "d/4" },
    { letter: "E", key: "e/4" }, { letter: "F", key: "f/4" }, { letter: "G", key: "g/4" },
  ],
  tenor: [
    { letter: "D", key: "d/3" }, { letter: "E", key: "e/3" }, { letter: "F", key: "f/3" },
    { letter: "G", key: "g/3" }, { letter: "A", key: "a/3" }, { letter: "B", key: "b/3" },
    { letter: "C", key: "c/4" }, { letter: "D", key: "d/4" }, { letter: "E", key: "e/4" },
  ],
};

const SEMITONES: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteKeyToFreq(noteKey: string): number {
  const m = noteKey.match(/^([a-gA-G])([#b]*)\/(-?\d+)$/);
  if (!m) return 440;
  const letter = m[1].toUpperCase() as Letter;
  const acc = m[2];
  const octave = parseInt(m[3], 10);
  let semi = SEMITONES[letter];
  for (const ch of acc) {
    if (ch === "#") semi += 1;
    if (ch === "b") semi -= 1;
  }
  const midi = (octave + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

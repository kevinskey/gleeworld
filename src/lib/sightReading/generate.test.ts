import { describe, it, expect } from 'vitest';
import { generateExercise } from './generate';

const LEVELS = [1, 2, 3, 4, 5, 6];
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

describe('generateExercise', () => {
  it('is deterministic for a given seed', () => {
    const a = generateExercise({ level: 3, key: 'C', seed: 42 });
    const b = generateExercise({ level: 3, key: 'C', seed: 42 });
    expect(a.notes).toEqual(b.notes);
  });

  it('always begins and ends on a tonic-triad member', () => {
    for (const level of LEVELS) for (const seed of SEEDS) {
      const ir = generateExercise({ level, key: 'C', seed });
      const triad = [0, 4, 7];
      const first = (((ir.notes[0].midi - ir.tonicMidi) % 12) + 12) % 12;
      const last = (((ir.notes.at(-1)!.midi - ir.tonicMidi) % 12) + 12) % 12;
      expect(triad).toContain(first);
      expect(last).toBe(0);           // end on do
    }
  });

  it('respects the level leap ceiling', () => {
    const CEIL: Record<number, number> = { 1: 4, 2: 5, 3: 7, 4: 7, 5: 9, 6: 12 };
    for (const level of LEVELS) for (const seed of SEEDS) {
      const ir = generateExercise({ level, key: 'C', seed });
      for (let i = 1; i < ir.notes.length; i++) {
        expect(Math.abs(ir.notes[i].midi - ir.notes[i - 1].midi)).toBeLessThanOrEqual(CEIL[level]);
      }
    }
  });

  it('follows every leap of a 4th or more with stepwise motion the other way', () => {
    for (const level of LEVELS) for (const seed of SEEDS) {
      const n = generateExercise({ level, key: 'C', seed }).notes;
      for (let i = 1; i < n.length - 1; i++) {
        const leap = n[i].midi - n[i - 1].midi;
        if (Math.abs(leap) >= 5) {
          const next = n[i + 1].midi - n[i].midi;
          expect(Math.abs(next)).toBeLessThanOrEqual(2);
          expect(Math.sign(next)).toBe(-Math.sign(leap));
        }
      }
    }
  });

  it('uses only pentatonic degrees at level 1', () => {
    const PENT = [0, 2, 4, 7, 9];
    for (const seed of SEEDS) {
      const ir = generateExercise({ level: 1, key: 'C', seed });
      for (const note of ir.notes) {
        expect(PENT).toContain((((note.midi - ir.tonicMidi) % 12) + 12) % 12);
      }
    }
  });

  it('stays within a singable range', () => {
    for (const level of LEVELS) for (const seed of SEEDS) {
      const midis = generateExercise({ level, key: 'C', seed }).notes.map(n => n.midi);
      expect(Math.max(...midis) - Math.min(...midis)).toBeLessThanOrEqual(12);
    }
  });
});

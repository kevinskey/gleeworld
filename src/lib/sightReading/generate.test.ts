import { describe, it, expect } from 'vitest';
import { generateExercise } from './generate';

const LEVELS = [1, 2, 3, 4, 5, 6];
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

describe('generateExercise', () => {
  it('is deterministic for a given seed', () => {
    for (const level of LEVELS) for (const seed of SEEDS.slice(0, 10)) {
      const a = generateExercise({ level, key: 'C', seed });
      const b = generateExercise({ level, key: 'C', seed });
      expect(a).toEqual(b);
    }
  });

  it('keeps every note within the declared phrase count', () => {
    for (const level of LEVELS) for (const seed of SEEDS) {
      const ir = generateExercise({ level, key: 'C', seed });
      for (const note of ir.notes) {
        expect([0, 1]).toContain(note.phraseIdx);
      }
      expect(Math.max(...ir.notes.map((n) => n.phraseIdx))).toBeLessThan(ir.phrases);
    }
  });

  it('ends exactly at the realized total length', () => {
    for (const level of LEVELS) for (const seed of SEEDS) {
      const ir = generateExercise({ level, key: 'C', seed });
      const realizedBeats = ir.notes.reduce((sum, n) => sum + n.durationBeats, 0);
      const last = ir.notes.at(-1)!;
      expect(last.beatPos + last.durationBeats).toBe(realizedBeats);
    }
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

import { describe, it, expect } from 'vitest';
import { generateExercise } from './generate';

const LEVELS = [1, 2, 3, 4, 5, 6];
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);
// Exercise both the level's default bar count (undefined) and caller-chosen lengths.
const BARS_VARIANTS: (number | undefined)[] = [undefined, 2, 4, 8, 16];
const DEFAULT_BARS: Record<number, number> = { 1: 2, 2: 4, 3: 4, 4: 4, 5: 8, 6: 8 };

describe('generateExercise', () => {
  it('is deterministic for a given seed', () => {
    for (const level of LEVELS) for (const seed of SEEDS.slice(0, 10)) for (const bars of BARS_VARIANTS) {
      const a = generateExercise({ level, key: 'C', seed, bars });
      const b = generateExercise({ level, key: 'C', seed, bars });
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

  it('always fills whole bars — no fractional overshoot/undershoot', () => {
    for (const level of LEVELS) for (const seed of SEEDS) for (const bars of BARS_VARIANTS) {
      const ir = generateExercise({ level, key: 'C', seed, bars });
      const totalBeats = ir.notes.reduce((sum, n) => sum + n.durationBeats, 0);
      const expectedBars = bars ?? DEFAULT_BARS[level];
      expect(totalBeats).toBe(expectedBars * 4);
      const last = ir.notes.at(-1)!;
      expect(last.beatPos + last.durationBeats).toBe(expectedBars * 4);
    }
  });

  it('begins on a tonic-triad member and cadences on a downbeat tonic', () => {
    for (const level of LEVELS) for (const seed of SEEDS) for (const bars of BARS_VARIANTS) {
      const ir = generateExercise({ level, key: 'C', seed, bars });
      const triad = [0, 4, 7];
      const first = (((ir.notes[0].midi - ir.tonicMidi) % 12) + 12) % 12;
      const last = ir.notes.at(-1)!;
      const lastDegree = (((last.midi - ir.tonicMidi) % 12) + 12) % 12;
      expect(triad).toContain(first);
      expect(lastDegree).toBe(0);            // end on do
      expect(last.beatPos % 4).toBe(0);       // cadence lands on a downbeat
    }
  });

  it('respects the level leap ceiling, apart from the final directed cadence resolution', () => {
    const CEIL: Record<number, number> = { 1: 4, 2: 5, 3: 7, 4: 7, 5: 9, 6: 12 };
    for (const level of LEVELS) for (const seed of SEEDS) {
      const ir = generateExercise({ level, key: 'C', seed });
      // The last note is a reserved downbeat-tonic cadence, not a stepwise/leap-limited
      // continuation of the line — it may leap in from wherever the content line ended.
      for (let i = 1; i < ir.notes.length - 1; i++) {
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

  it('stays within the fixed ambitus around the tonic', () => {
    for (const level of LEVELS) for (const seed of SEEDS) for (const bars of BARS_VARIANTS) {
      const ir = generateExercise({ level, key: 'C', seed, bars });
      const midis = ir.notes.map((n) => n.midi);
      expect(Math.min(...midis)).toBeGreaterThanOrEqual(ir.tonicMidi - 5);
      expect(Math.max(...midis)).toBeLessThanOrEqual(ir.tonicMidi + 12);
    }
  });
});

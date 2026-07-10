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

  it('never writes a melodic tritone', () => {
    // The redesign has no per-level leap ceiling; instead every leap must be either
    // consonant-and-resolved or shrunk away, and a bare tritone is never emitted.
    for (const level of LEVELS) for (const seed of SEEDS) for (const bars of BARS_VARIANTS) {
      const n = generateExercise({ level, key: 'C', seed, bars }).notes;
      for (let i = 1; i < n.length; i++) {
        expect(Math.abs(n[i].midi - n[i - 1].midi)).not.toBe(6);
      }
    }
  });

  it('follows every leap of a 4th or more with a contrary step of a whole tone or less', () => {
    // Replaces the old hard maxLeap ceiling: the singable invariant is not a leap
    // size limit but that any leap resolves by contrary stepwise motion. The leap
    // INTO the final cadence tonic is exempt (a reserved cadential gesture).
    for (const level of LEVELS) for (const seed of SEEDS) for (const bars of BARS_VARIANTS) {
      const n = generateExercise({ level, key: 'C', seed, bars }).notes;
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

  it('builds to exactly one climax, in the second half for multi-phrase lines', () => {
    for (const level of LEVELS) for (const seed of SEEDS) for (const bars of BARS_VARIANTS) {
      const ir = generateExercise({ level, key: 'C', seed, bars });
      const midis = ir.notes.map((n) => n.midi);
      const peak = Math.max(...midis);
      const peakIdxs = midis.map((m, i) => (m === peak ? i : -1)).filter((i) => i >= 0);
      expect(peakIdxs).toHaveLength(1); // a single, unambiguous high point
      const total = (bars ?? DEFAULT_BARS[level]) * 4;
      if (total >= 16) expect(ir.notes[peakIdxs[0]].beatPos).toBeGreaterThanOrEqual(total / 2);
    }
  });

  it('beams eighths in pairs — every eighth is adjacent to another within its beat', () => {
    for (const level of LEVELS) for (const seed of SEEDS) for (const bars of BARS_VARIANTS) {
      const n = generateExercise({ level, key: 'C', seed, bars }).notes;
      for (let i = 0; i < n.length; i++) {
        if (n[i].durationBeats !== 0.5) continue;
        const beat = Math.floor(n[i].beatPos);
        const pairAfter = n[i + 1]?.durationBeats === 0.5 && Math.floor(n[i + 1].beatPos) === beat;
        const pairBefore = n[i - 1]?.durationBeats === 0.5 && Math.floor(n[i - 1].beatPos) === beat;
        expect(pairAfter || pairBefore).toBe(true);
      }
    }
  });

  it('raises the leading tone and avoids augmented seconds in minor', () => {
    for (const level of LEVELS) for (const seed of SEEDS.slice(0, 20)) for (const bars of [4, 8] as const) {
      const ir = generateExercise({ level, key: 'A', seed, bars, mode: 'minor' });
      expect(ir.mode).toBe('minor');
      const n = ir.notes;
      const rel = (m: number) => (((m - ir.tonicMidi) % 12) + 12) % 12;
      // penultimate note is the raised leading tone (ti) or supertonic (re) into do
      const penPc = rel(n[n.length - 2].midi);
      expect([11, 2]).toContain(penPc);
      // no ascending le(♭6)→ti(♯7) augmented second
      for (let i = 1; i < n.length; i++) {
        if (n[i].midi > n[i - 1].midi && Math.abs(n[i].midi - n[i - 1].midi) === 3) {
          expect(rel(n[i - 1].midi) === 8 && rel(n[i].midi) === 11).toBe(false);
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

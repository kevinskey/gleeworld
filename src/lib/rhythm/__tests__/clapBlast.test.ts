import { describe, it, expect } from 'vitest';
import { createClapBlastRound } from '../clapBlast';

// 100 bpm quarters → spp 0.6, tol 60ms, window 120ms
const mk = (over: Partial<Parameters<typeof createClapBlastRound>[0]> = {}) =>
  createClapBlastRound({ expected: [0, 0.6, 1.2, 1.8], secondsPerPulse: 0.6, tolerancePct: 0.10, ...over });

describe('createClapBlastRound', () => {
  it('perfect clap explodes the note and raises score/streak', () => {
    const r = mk();
    const ev = r.tick(0.05, [0.01]);
    expect(ev).toEqual([{ kind: 'hit', noteIndex: 0, grade: 'perfect', deltaSec: expect.closeTo(0.01, 5) }]);
    expect(r.noteStates()[0]).toBe('perfect');
    expect(r.streak()).toBe(1);
    expect(r.score()).toBe(25); // 1/4 notes
  });

  it('clap inside 2×tol but outside tol grades good', () => {
    const r = mk();
    const ev = r.tick(0.2, [0.09]); // +90ms, tol 60 / window 120
    expect(ev[0]).toMatchObject({ kind: 'hit', noteIndex: 0, grade: 'good' });
    expect(r.score()).toBe(13); // round(100*0.5/4)
  });

  it('a note whose window passes un-clapped emits miss and resets streak', () => {
    const r = mk();
    r.tick(0.05, [0.0]); // hit note 0 → streak 1
    const ev = r.tick(0.6 + 0.121, []); // past note 1's window
    expect(ev).toEqual([{ kind: 'miss', noteIndex: 1 }]);
    expect(r.noteStates()[1]).toBe('missed');
    expect(r.streak()).toBe(0);
    expect(r.bestStreak()).toBe(1);
  });

  it('stray claps emit stray, count, but never change the score', () => {
    const r = mk();
    r.tick(0.05, [0.0]);
    const before = r.score();
    const ev = r.tick(0.31, [0.0, 0.3]); // 0.3 is 300ms from notes 0(claimed) and 1 → stray
    expect(ev).toEqual([{ kind: 'stray', noteIndex: null }]);
    expect(r.strayCount()).toBe(1);
    expect(r.score()).toBe(before);
    expect(r.streak()).toBe(1); // strays don't reset streak
  });

  it('only consumes NEW onsets across ticks (live-mutating array)', () => {
    const r = mk();
    const onsets: number[] = [0.0];
    r.tick(0.05, onsets);
    onsets.push(0.61);
    const ev = r.tick(0.7, onsets);
    expect(ev).toEqual([{ kind: 'hit', noteIndex: 1, grade: 'perfect', deltaSec: expect.closeTo(0.01, 5) }]);
  });

  it('latencySec shifts grading but reports musical-time values', () => {
    const r = mk({ latencySec: 0.15 });
    // clap arrives 150ms "late" on the mic clock but is musically perfect
    const ev = r.tick(0.2, [0.15]);
    expect(ev[0]).toMatchObject({ kind: 'hit', noteIndex: 0, grade: 'perfect' });
    r.tick(3.0, []); // close everything out
    const g = r.toGradeResult();
    expect(g.notes[0].expectedSec).toBeCloseTo(0);
    expect(g.notes[0].actualSec).toBeCloseTo(0); // 0.15 − latency
  });

  it('toGradeResult maps grades to Verdicts, no stray penalty, pass at 80', () => {
    const r = mk();
    r.tick(0.05, [0.0]);          // perfect
    r.tick(0.75, [0.69]);         // +90ms → good/late
    r.tick(1.25, [1.19]);         // perfect
    r.tick(1.85, [1.81, 1.5]);    // perfect + stray
    r.tick(5, []);
    const g = r.toGradeResult();
    expect(g.notes.map((n) => n.verdict)).toEqual(['on_time', 'late', 'on_time', 'on_time']);
    expect(g.extraOnsets).toHaveLength(1);
    expect(g.score).toBe(88); // (1+0.5+1+1)/4 — stray NOT penalized
    expect(g.passed).toBe(true);
    expect(r.isFinished()).toBe(true);
  });

  it('isFinished is false while any note is pending', () => {
    const r = mk();
    r.tick(0.05, [0.0]);
    expect(r.isFinished()).toBe(false);
  });

  it('tolerance floor applies at fast tempos', () => {
    const r = createClapBlastRound({ expected: [0], secondsPerPulse: 0.2, tolerancePct: 0.06 }); // 12ms → floor 30ms
    const ev = r.tick(0.05, [0.025]);
    expect(ev[0]).toMatchObject({ grade: 'perfect' });
  });
});

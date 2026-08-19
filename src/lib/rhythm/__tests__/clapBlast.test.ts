import { describe, it, expect } from 'vitest';
import { createClapBlastRound, calibrationOffsetSec, CALIBRATION_CLICKS, CALIBRATION_BPM } from '../clapBlast';

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
    const onsets: number[] = [];
    const push = (...t: number[]) => { onsets.push(...t); return onsets; };
    r.tick(0.05, push(0.0));          // perfect
    r.tick(0.75, push(0.69));         // +90ms → good/late
    r.tick(1.25, push(1.19));         // perfect
    r.tick(1.85, push(1.81, 1.5));    // perfect + stray
    r.tick(5, onsets);
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

  it('an empty pattern scores 0, never passes, and does not crash', () => {
    const r = createClapBlastRound({ expected: [], secondsPerPulse: 0.6, tolerancePct: 0.10 });
    const ev = r.tick(0.5, [0.5]);
    expect(ev).toEqual([{ kind: 'stray', noteIndex: null }]);
    expect(r.score()).toBe(0);
    expect(r.isFinished()).toBe(true);
    const g = r.toGradeResult();
    expect(g.notes).toEqual([]);
    expect(g.score).toBe(0);
    expect(g.passed).toBe(false);
  });

  it('reports stray onsets in musical time, not mic time', () => {
    const r = mk({ latencySec: 0.15 });
    // Mic-time 1.0 is 250ms from the nearest shifted note (0.75) → stray.
    // (The same tick also closes notes 0 and 1's windows.)
    expect(r.tick(1.05, [1.0])[0]).toEqual({ kind: 'stray', noteIndex: null });
    const g = r.toGradeResult();
    expect(g.extraOnsets).toHaveLength(1);
    expect(g.extraOnsets[0]).toBeCloseTo(0.85, 5); // 1.0 − latency
  });

  it('bestStreak survives a miss and a rebuilt streak', () => {
    const r = mk();
    const onsets: number[] = [];
    onsets.push(0.0);
    r.tick(0.05, onsets);          // hit note 0 → streak 1
    onsets.push(0.6);
    r.tick(0.65, onsets);          // hit note 1 → streak 2
    r.tick(1.35, onsets);          // note 2's window closed → miss, streak 0
    onsets.push(1.8);
    r.tick(1.85, onsets);          // hit note 3 → streak 1
    expect(r.streak()).toBe(1);
    expect(r.bestStreak()).toBe(2);
  });

  it('tolerance floor applies at fast tempos', () => {
    const r = createClapBlastRound({ expected: [0], secondsPerPulse: 0.2, tolerancePct: 0.06 }); // 12ms → floor 30ms
    const ev = r.tick(0.05, [0.025]);
    expect(ev[0]).toMatchObject({ grade: 'perfect' });
  });
});

describe('calibrationOffsetSec', () => {
  const clicks = Array.from({ length: 8 }, (_, i) => i * (60 / 90)); // 8 clicks @90bpm

  it('returns the median offset when the user claps consistently late', () => {
    const claps = clicks.map((c, i) => c + 0.12 + (i % 2 ? 0.01 : -0.01));
    expect(calibrationOffsetSec(clicks, claps)).toBeCloseTo(0.12, 2);
  });

  it('ignores stray claps and survives one missed click', () => {
    const claps = [...clicks.slice(0, 7).map((c) => c + 0.1), 2.9]; // 7 matched + 1 stray
    expect(calibrationOffsetSec(clicks, claps)).toBeCloseTo(0.1, 2);
  });

  it('returns null with fewer than 5 matches', () => {
    const claps = clicks.slice(0, 4).map((c) => c + 0.1);
    expect(calibrationOffsetSec(clicks, claps)).toBeNull();
  });

  it('clamps implausible medians into [-0.1, 0.6]', () => {
    // −300ms is inside the ±350ms match window, so it matches; median −0.3 clamps to −0.1
    const early = clicks.map((c) => c - 0.3);
    expect(calibrationOffsetSec(clicks, early)).toBeCloseTo(-0.1, 5);
  });

  it('exports the click count and bpm the UI schedules with', () => {
    expect(CALIBRATION_CLICKS).toBe(8);
    expect(CALIBRATION_BPM).toBe(90);
  });
});

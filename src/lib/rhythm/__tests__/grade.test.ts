import { describe, it, expect } from 'vitest';
import { gradeOnsets, expectedOnsets, PASS_THRESHOLD } from '../grade';
import { generatePattern } from '../generate';

const opts = { secondsPerPulse: 0.6, tolerancePct: 0.10 }; // 100bpm → tol 60ms, window 120ms

describe('gradeOnsets', () => {
  it('perfect performance scores 100', () => {
    const exp = [0, 0.6, 1.2, 1.8];
    const r = gradeOnsets(exp, [0.01, 0.61, 1.19, 1.81], opts);
    expect(r.notes.map((n) => n.verdict)).toEqual(['on_time', 'on_time', 'on_time', 'on_time']);
    expect(r.score).toBe(100);
    expect(r.passed).toBe(true);
  });
  it('early/late within window score half; outside window = missed', () => {
    const r = gradeOnsets([0, 0.6], [0.09, 0.6 + 0.13], opts); // +90ms late (window 120); +130ms → missed
    expect(r.notes[0].verdict).toBe('late');
    expect(r.notes[1].verdict).toBe('missed');
    expect(r.score).toBe(25); // (0.5 + 0) / 2
  });
  it('extra onsets penalize 0.25 each', () => {
    const r = gradeOnsets([0, 0.6], [0.0, 0.6, 0.3], opts);
    expect(r.extraOnsets).toEqual([0.3]);
    expect(r.score).toBe(88); // (2 - 0.25)/2 = 0.875
  });
  it('each actual onset matches at most one expected note', () => {
    const r = gradeOnsets([0, 0.05], [0.0], { secondsPerPulse: 0.6, tolerancePct: 0.5 });
    const matched = r.notes.filter((n) => n.actualSec !== null);
    expect(matched).toHaveLength(1);
  });
  it('tolerance has a 30ms floor at fast tempos', () => {
    const fast = { secondsPerPulse: 0.2, tolerancePct: 0.06 }; // 6% = 12ms → floored to 30ms
    const r = gradeOnsets([0], [0.025], fast);
    expect(r.notes[0].verdict).toBe('on_time');
  });
  it('score never goes below 0 and empty expected is safe', () => {
    const r = gradeOnsets([], [0.1, 0.2, 0.3], opts);
    expect(r.score).toBe(0);
    expect(r.passed).toBe(false);
  });
  it('expectedOnsets skips rests and converts pulses to seconds', () => {
    const p = generatePattern(3, 7); // level with rests
    const exp = expectedOnsets(p, 0.5);
    expect(exp.length).toBe(p.events.filter((e) => !e.rest).length);
    const first = p.events.find((e) => !e.rest)!;
    expect(exp[0]).toBeCloseTo(first.startPulse * 0.5, 9);
  });
  it('PASS_THRESHOLD is 80', () => expect(PASS_THRESHOLD).toBe(80));
});

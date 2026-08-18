import { describe, expect, it } from 'vitest';
import { JOB_BUDGET_MS, makeDeadline } from '../jobDeadline.ts';

// The normalizer processed its whole limit in one invocation and died at
// exactly 60s against a 43-lot backlog — the edge runtime's wall clock. The
// nightly cron would have hit the same wall every night and reported nothing,
// because the 500 replaces the JSON body that carries the progress report.
//
// Jobs now stop themselves before the runtime does, and say what they got
// through, so the next run continues from there.
describe('makeDeadline', () => {
  it('has room at the start', () => {
    const d = makeDeadline(1000, 60_000);
    expect(d.expired(1000)).toBe(false);
    expect(d.remainingMs(1000)).toBe(60_000);
  });

  it('expires once the budget is spent', () => {
    const d = makeDeadline(1000, 60_000);
    expect(d.expired(61_001)).toBe(true);
  });

  it('stops BEFORE the next unit would overrun, not after', () => {
    // The point is to never start work that cannot finish. With 8s left and
    // a unit that historically takes 20s, the answer must be "stop".
    const d = makeDeadline(0, 60_000);
    expect(d.canAfford(52_000, 20_000)).toBe(false);
    expect(d.canAfford(30_000, 20_000)).toBe(true);
  });

  it('always allows the first unit, so a slow estimate cannot starve the job', () => {
    // Otherwise a job whose estimate exceeds the whole budget would return
    // "did nothing" forever and the backlog would never move.
    const d = makeDeadline(0, 60_000);
    expect(d.canAfford(0, 999_000, true)).toBe(true);
    expect(d.canAfford(0, 999_000, false)).toBe(false);
  });

  it('reports remaining time, floored at zero', () => {
    const d = makeDeadline(0, 60_000);
    expect(d.remainingMs(70_000)).toBe(0);
  });

  it('defaults to a budget under the runtime limit, with headroom to reply', () => {
    // The reply itself has to be written and flushed after the last unit.
    expect(JOB_BUDGET_MS).toBeLessThan(60_000);
    expect(JOB_BUDGET_MS).toBeGreaterThanOrEqual(30_000);
  });
});

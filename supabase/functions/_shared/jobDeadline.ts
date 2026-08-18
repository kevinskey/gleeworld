// A wall clock for scheduled edge functions.
//
// Supabase edge functions are killed at 60 seconds. A batch job that just
// loops over its work will hit that wall the first time the backlog is real,
// and the kill takes the response with it — so the job reports NOTHING, not
// even the items it did finish. That is exactly how auctions-normalize
// behaved against its first 43-lot backlog: HTTP 500 at 60.1s, no progress
// report, and a nightly cron that would have failed silently every night.
//
// A job that watches this clock stops one unit short of the wall, returns
// its progress, and lets the next scheduled run continue. Slower than
// finishing in one go; infinitely better than finishing never.

/**
 * Budget per invocation.
 *
 * Well under the 60s kill on purpose. The check happens BEFORE a unit starts,
 * so the last unit still runs past the budget — a run was observed finishing
 * at 48s against a 45s budget. The margin has to cover one whole overrunning
 * unit, not just the reply.
 */
export const JOB_BUDGET_MS = 35_000;

export interface Deadline {
  /** True once the budget is spent. */
  expired(now: number): boolean;
  /** Milliseconds left, never negative. */
  remainingMs(now: number): number;
  /**
   * Whether one more unit of work fits.
   *
   * `isFirst` always says yes: a job whose per-unit estimate exceeds the whole
   * budget would otherwise return "did nothing" forever and never drain its
   * backlog. Better to start one unit and risk the kill than to guarantee no
   * progress at all.
   */
  canAfford(now: number, estimatedMs: number, isFirst?: boolean): boolean;
}

export function makeDeadline(startedAt: number, budgetMs: number = JOB_BUDGET_MS): Deadline {
  const endsAt = startedAt + budgetMs;
  return {
    expired: (now) => now > endsAt,
    remainingMs: (now) => Math.max(0, endsAt - now),
    canAfford: (now, estimatedMs, isFirst = false) =>
      isFirst || now + estimatedMs <= endsAt,
  };
}

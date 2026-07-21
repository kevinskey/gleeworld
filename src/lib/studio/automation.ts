// Automation — Phase 8 foundation.
//
// Breakpoint automation for a single strip parameter. This module is
// intentionally Tone-free / engine-free so the math is unit-testable
// without an AudioContext. The engine consumes it via
// engine/automation.ts, which schedules Tone AudioParam ramps against
// the transport clock.
//
// A "point" pairs a transport time with a target value and a curve
// that describes HOW the ramp INTO this point interpolates from the
// previous point. Curves:
//   - 'hold'        — step (previous value held until this point's time)
//   - 'linear'      — linear interpolation from previous to this point
//   - 'exponential' — exponential interpolation (both endpoints > 0)
//
// The FIRST point's curve is unused (nothing to interpolate from). By
// convention we still store it (usually 'linear') to keep the shape
// uniform.

export type AutomationCurve = 'hold' | 'linear' | 'exponential';

export interface AutomationPoint {
  time_seconds: number;
  value: number;
  curve: AutomationCurve;
}

/** Return the points sorted by time. Session storage doesn't enforce
 *  order, and unordered points would produce garbage interpolation. */
export function sortAutomationPoints(points: AutomationPoint[]): AutomationPoint[] {
  return [...points].sort((a, b) => a.time_seconds - b.time_seconds);
}

/** Evaluate the automation curve at a given transport time. Returns
 *  undefined when the points array is empty — caller uses the stored
 *  session value in that case. Values before the first point clamp to
 *  the first point's value; values after the last point clamp to the
 *  last point's value. */
export function automationValueAt(
  points: AutomationPoint[],
  atSeconds: number,
): number | undefined {
  if (points.length === 0) return undefined;
  const sorted = sortAutomationPoints(points);
  if (atSeconds <= sorted[0].time_seconds) return sorted[0].value;
  const last = sorted[sorted.length - 1];
  if (atSeconds >= last.time_seconds) return last.value;
  // Find the bracketing pair (prev, next) via linear scan — automation
  // lists are short in practice (< a hundred points per param); binary
  // search would be premature optimization.
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (atSeconds > next.time_seconds) continue;
    const prev = sorted[i - 1];
    return interpolate(prev, next, atSeconds);
  }
  return last.value; // unreachable in practice
}

function interpolate(prev: AutomationPoint, next: AutomationPoint, at: number): number {
  const span = next.time_seconds - prev.time_seconds;
  if (span <= 0) return next.value;
  const t = (at - prev.time_seconds) / span; // 0..1
  switch (next.curve) {
    case 'hold':
      // Step at the target time: everything before the point holds prev.
      return prev.value;
    case 'linear':
      return prev.value + (next.value - prev.value) * t;
    case 'exponential':
      // Web Audio's exponentialRampToValueAtTime rejects endpoints at
      // or below 0. Fall back to linear when the pair crosses zero —
      // matches the fallback we apply when scheduling on the AudioParam.
      if (prev.value <= 0 || next.value <= 0) {
        return prev.value + (next.value - prev.value) * t;
      }
      return prev.value * Math.pow(next.value / prev.value, t);
  }
}

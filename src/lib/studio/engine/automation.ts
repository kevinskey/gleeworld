// Engine-side automation scheduler.
//
// Applies breakpoint automation from the session to a Tone.Param
// against the transport clock. Called from engine.play() when any
// Automation entry is in read mode; cleared from engine.stop() /
// pause() / seek() via cancelAutomation().
//
// The interpolation math is deliberately extracted into
// src/lib/studio/automation.ts so it's unit-testable without Tone.
// Here we just translate points into the equivalent AudioParam
// scheduling calls at the right transport times.

import * as Tone from 'tone';
import type { AutomationPoint } from '../automation';
import { sortAutomationPoints } from '../automation';

/** Tone.Param handles that automation can drive. Same type surface
 *  used by both track and bus strips (their panvol exposes .volume
 *  and .pan as Tone.Param<AutomationRange>). */
export type AutomatableParam = Tone.Param<'decibels'> | Tone.Param<'audioRange'> | Tone.Param<'gain'>;

/** Schedule ramps for one breakpoint envelope against the transport.
 *  Returns a cancel function that removes only THIS envelope's
 *  scheduled events (via a Tone.Transport handle set), so different
 *  automation entries can be scheduled + cancelled independently. */
export function scheduleAutomation(
  param: AutomatableParam,
  points: AutomationPoint[],
  transportStartSeconds: number,
): () => void {
  const sorted = sortAutomationPoints(points);
  if (sorted.length === 0) return () => { /* nothing scheduled */ };
  const transport = Tone.getTransport();
  const handles: number[] = [];

  // Snapshot the current position so we can schedule points that fall
  // AFTER the current transport position; earlier ones become an
  // immediate setValueAtTime with the interpolated value at "now".
  const now = Tone.now();

  // Prime the param at now with the interpolated value at the current
  // position — the ramp INTO the next point starts from this value.
  const primeValue = interpolateAtTransportTime(sorted, transportStartSeconds);
  try { param.cancelScheduledValues(now); } catch { /* Tone versions vary */ }
  try { (param as { setValueAtTime?: (v: number, t: number) => void }).setValueAtTime?.(primeValue, now); }
  catch { /* fallback: direct write */ (param as unknown as { value: number }).value = primeValue; }

  // Schedule each future point as a ramp appropriate to its curve.
  for (let i = 0; i < sorted.length; i++) {
    const point = sorted[i];
    if (point.time_seconds <= transportStartSeconds) continue;
    const handle = transport.schedule((time) => {
      try {
        switch (point.curve) {
          case 'hold': {
            const prev = sorted[i - 1];
            if (prev) {
              (param as { setValueAtTime?: (v: number, t: number) => void })
                .setValueAtTime?.(prev.value, time);
            }
            (param as { setValueAtTime?: (v: number, t: number) => void })
              .setValueAtTime?.(point.value, time);
            break;
          }
          case 'linear': {
            (param as { linearRampToValueAtTime?: (v: number, t: number) => void })
              .linearRampToValueAtTime?.(point.value, time);
            break;
          }
          case 'exponential': {
            const prev = sorted[i - 1]?.value ?? point.value;
            // Web Audio's exponentialRampToValueAtTime rejects endpoints
            // at or below 0. Fall back to linear when crossing zero.
            if (prev <= 0 || point.value <= 0) {
              (param as { linearRampToValueAtTime?: (v: number, t: number) => void })
                .linearRampToValueAtTime?.(point.value, time);
            } else {
              (param as { exponentialRampToValueAtTime?: (v: number, t: number) => void })
                .exponentialRampToValueAtTime?.(point.value, time);
            }
            break;
          }
        }
      } catch {
        // Best-effort — a param that rejects a ramp mid-schedule
        // (e.g. after dispose) should not crash the transport tick.
      }
    }, point.time_seconds);
    handles.push(handle);
  }

  return () => {
    for (const h of handles) {
      try { transport.clear(h); } catch { /* already gone */ }
    }
  };
}

/** Same interpolation as automation.ts's automationValueAt but inlined
 *  to avoid a circular import through the engine barrel. */
function interpolateAtTransportTime(points: AutomationPoint[], t: number): number {
  if (t <= points[0].time_seconds) return points[0].value;
  const last = points[points.length - 1];
  if (t >= last.time_seconds) return last.value;
  for (let i = 1; i < points.length; i++) {
    const next = points[i];
    if (t > next.time_seconds) continue;
    const prev = points[i - 1];
    const span = next.time_seconds - prev.time_seconds;
    if (span <= 0) return next.value;
    const alpha = (t - prev.time_seconds) / span;
    switch (next.curve) {
      case 'hold':
        return prev.value;
      case 'linear':
        return prev.value + (next.value - prev.value) * alpha;
      case 'exponential':
        if (prev.value <= 0 || next.value <= 0) {
          return prev.value + (next.value - prev.value) * alpha;
        }
        return prev.value * Math.pow(next.value / prev.value, alpha);
    }
  }
  return last.value;
}

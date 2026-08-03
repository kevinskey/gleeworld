import { describe, it, expect } from 'vitest';
import { MidiTimebase, MIDI_TIMEBASE_DRIFT_LIMIT_SEC, formatMonitoringLatency } from '../midiTimebase';

// The recording bug this fixes: note times were read from the engine's
// ~30Hz positionSeconds snapshot at handler run time, so every note
// quantized to a ±33ms grid plus main-thread lag ("fast eighths don't
// lock"). The timebase maps each event's hardware timestamp
// (performance.now() domain) onto the transport instead: one anchor per
// take, hardware-precise deltas after that.

describe('MidiTimebase', () => {
  it('falls back to the snapshot when the event has no timestamp', () => {
    const tb = new MidiTimebase();
    expect(tb.toTransportSeconds(undefined, 4.2)).toBe(4.2);
    expect(tb.toTransportSeconds(0, 4.3)).toBe(4.3); // 0 = "no timestamp" per Web MIDI polyfills
  });

  it('anchors on the first timestamped event and returns the snapshot for it', () => {
    const tb = new MidiTimebase();
    expect(tb.toTransportSeconds(1000, 10)).toBe(10);
  });

  it('maps later events by hardware delta, ignoring snapshot jitter', () => {
    const tb = new MidiTimebase();
    tb.toTransportSeconds(1000, 10); // anchor: 1000ms ↔ 10s
    // Snapshot is stale/jittery (10.30, 10.21) but hardware says +250ms, +500ms.
    expect(tb.toTransportSeconds(1250, 10.3)).toBeCloseTo(10.25, 6);
    expect(tb.toTransportSeconds(1500, 10.21)).toBeCloseTo(10.5, 6);
  });

  it('keeps a steady eighth-note pulse through a janky UI clock', () => {
    const tb = new MidiTimebase();
    tb.toTransportSeconds(10000, 0); // anchor: 10000ms ↔ 0s
    // Player nails eighths at 120bpm (250ms apart); UI snapshot wobbles ±40ms.
    const wobble = [0.04, -0.03, 0.02, -0.04];
    const got = [1, 2, 3, 4].map((i) =>
      tb.toTransportSeconds(10000 + i * 250, i * 0.25 + wobble[i - 1]));
    expect(got).toEqual([0.25, 0.5, 0.75, 1.0]);
  });

  it('re-anchors when the transport jumps (loop wrap / seek)', () => {
    const tb = new MidiTimebase();
    tb.toTransportSeconds(1000, 10);
    // Loop wrapped: snapshot says 2.1s while hardware delta says 12s.
    expect(tb.toTransportSeconds(3000, 2.1)).toBe(2.1); // re-anchored
    expect(tb.toTransportSeconds(3250, 2.5)).toBeCloseTo(2.35, 6); // new anchor holds
  });

  it('tolerates snapshot staleness below the drift limit without re-anchoring', () => {
    const tb = new MidiTimebase();
    tb.toTransportSeconds(1000, 10);
    const nearLimit = MIDI_TIMEBASE_DRIFT_LIMIT_SEC - 0.05;
    expect(tb.toTransportSeconds(2000, 11 + nearLimit)).toBeCloseTo(11, 6);
  });

  it('reset() drops the anchor so the next take re-anchors fresh', () => {
    const tb = new MidiTimebase();
    tb.toTransportSeconds(1000, 10);
    tb.reset();
    expect(tb.toTransportSeconds(5000, 3)).toBe(3); // fresh anchor, not mapped from old one
    expect(tb.toTransportSeconds(5250, 3.4)).toBeCloseTo(3.25, 6);
  });

  it('holds a stable anchor across a 60-second take even with a wobbling snapshot', () => {
    // Regression: user reported "when im recording midi the beat seems
    // to be unstable" — verify a long take never re-anchors mid-flight
    // as long as the snapshot stays within the drift limit.
    const tb = new MidiTimebase();
    tb.toTransportSeconds(1, 0); // anchor: 1ms ↔ 0s (1 > 0 so it anchors)
    // Simulate 240 notes at 4 per second for a minute, snapshot wobbles
    // ±100 ms which is well inside MIDI_TIMEBASE_DRIFT_LIMIT_SEC (0.35).
    for (let i = 1; i <= 240; i++) {
      const ts = 1 + i * 250;            // exact hardware clock, offset by anchor
      const wobble = (i % 7 - 3) * 0.03; // ±90 ms wander
      const mapped = tb.toTransportSeconds(ts, i * 0.25 + wobble);
      // Hardware delta must win, snapshot wobble ignored.
      expect(mapped).toBeCloseTo(i * 0.25, 6);
    }
  });

  it('re-anchors when drift crosses the limit', () => {
    // If we ever loosen MIDI_TIMEBASE_DRIFT_LIMIT_SEC, this documents the
    // "strictly greater than triggers re-anchor" boundary with fp headroom.
    const tb = new MidiTimebase();
    tb.toTransportSeconds(1, 0); // anchor: 1ms ↔ 0s
    const belowLimit = MIDI_TIMEBASE_DRIFT_LIMIT_SEC - 0.001;
    // Snapshot 1 + belowLimit vs mapped 1.0 → |Δ| < limit → map wins.
    expect(tb.toTransportSeconds(1001, 1 + belowLimit)).toBeCloseTo(1, 6);
    // Snapshot 2 + (limit + 0.01) vs mapped 2.0 → |Δ| > limit → re-anchor
    // → returns the snapshot itself.
    const overshoot = MIDI_TIMEBASE_DRIFT_LIMIT_SEC + 0.01;
    expect(tb.toTransportSeconds(2001, 2 + overshoot)).toBeCloseTo(2 + overshoot, 6);
  });

  it('two takes in a row anchor independently after reset', () => {
    const tb = new MidiTimebase();
    // Take 1: three notes at 120 bpm.
    tb.toTransportSeconds(1000, 5);
    expect(tb.toTransportSeconds(1250, 5.25)).toBeCloseTo(5.25, 6);
    expect(tb.toTransportSeconds(1500, 5.5)).toBeCloseTo(5.5, 6);
    // Stop → new take starts at a different transport position.
    tb.reset();
    tb.toTransportSeconds(9000, 12);
    // Delta from take-2 anchor, NOT from take-1 anchor.
    expect(tb.toTransportSeconds(9500, 12.5)).toBeCloseTo(12.5, 6);
  });
});

describe('formatMonitoringLatency', () => {
  it('rounds and labels', () => {
    expect(formatMonitoringLatency(12.4)).toBe('monitoring ≈ 12ms');
    expect(formatMonitoringLatency(0)).toBe('monitoring ≈ 0ms');
  });
  it('clamps negatives to 0', () => {
    expect(formatMonitoringLatency(-3)).toBe('monitoring ≈ 0ms');
  });
});

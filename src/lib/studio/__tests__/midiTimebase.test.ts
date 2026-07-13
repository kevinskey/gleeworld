import { describe, it, expect } from 'vitest';
import { MidiTimebase, MIDI_TIMEBASE_DRIFT_LIMIT_SEC } from '../midiTimebase';

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
});

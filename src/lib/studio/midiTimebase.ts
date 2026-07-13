// Maps hardware MIDI event timestamps onto the Studio transport for
// recording. Why: capture used to stamp notes with the engine's
// positionSeconds SNAPSHOT (updated ~30Hz for the playhead UI) read at
// handler run time — every note quantized to a ±33ms grid plus whatever
// main-thread lag the render loop added, which is why fast passages
// never locked. Web MIDI stamps each event with a high-resolution
// performance.now()-domain time at hardware receipt, immune to all of
// that; this class anchors that clock to the transport once per take
// and converts by hardware delta from then on.
//
// The anchor itself inherits the snapshot's staleness (a constant
// offset of ≤ ~33ms for the whole take) — constant offsets are handled
// by the existing latency compensation + user trim; it's the per-note
// JITTER that made recordings feel unstable, and that is what the
// hardware deltas eliminate.

/** Mapped-vs-snapshot divergence beyond this means the transport moved
 * under us (loop wrap, seek) — or the timestamp isn't in the expected
 * clock domain — so we re-anchor at the snapshot. Comfortably above
 * worst-case UI staleness (~0.15s), comfortably below one bar. */
export const MIDI_TIMEBASE_DRIFT_LIMIT_SEC = 0.35;

export class MidiTimebase {
  private anchorMs: number | null = null;
  private anchorSec = 0;

  /** Convert one event. `timeStampMs` is the hardware event timestamp
   * (performance.now() domain; undefined/0 = not provided — native
   * plugin, some devices). `fallbackSeconds` is the current transport
   * snapshot, used to anchor and as the answer when no timestamp exists. */
  toTransportSeconds(timeStampMs: number | undefined, fallbackSeconds: number): number {
    if (timeStampMs === undefined || !(timeStampMs > 0)) return fallbackSeconds;
    if (this.anchorMs === null) {
      this.anchorMs = timeStampMs;
      this.anchorSec = fallbackSeconds;
      return fallbackSeconds;
    }
    const mapped = this.anchorSec + (timeStampMs - this.anchorMs) / 1000;
    if (Math.abs(mapped - fallbackSeconds) > MIDI_TIMEBASE_DRIFT_LIMIT_SEC) {
      this.anchorMs = timeStampMs;
      this.anchorSec = fallbackSeconds;
      return fallbackSeconds;
    }
    return mapped;
  }

  /** Drop the anchor (record start/stop) so the next take anchors fresh. */
  reset(): void {
    this.anchorMs = null;
    this.anchorSec = 0;
  }
}

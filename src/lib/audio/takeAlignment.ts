// Take alignment: converts per-take wall-clock stamps into the head-trim
// and clip-placement offset that put recorded audio on the grid.
//
// The old approach trimmed a single configured guess (default 700ms) off
// every take's head. Real startup cost (getUserMedia, transport start)
// varies per device/session, so takes landed late whenever the guess was
// short — e.g. a full beat at 72 BPM on iPad. Now the startup component
// is MEASURED per take and the configured dial covers only true hardware
// I/O latency (mic ADC + output DAC + Bluetooth, typically 100–300ms).

export interface TakeStamps {
  /** performance.now() when record was pressed — the moment the timeline
   * anchor (clip.start_seconds) was snapshotted. */
  pressWallMs: number;
  /** performance.now() when the capture stream actually went live. */
  captureStartWallMs: number;
  /** performance.now() right after transport playback started, or null
   * when the transport was already playing at press (punch flow). */
  transportStartWallMs: number | null;
  /** Configured residual hardware latency (studio.deviceLatencyMs). */
  deviceLatencyMs: number;
}

export interface TakeAlignment {
  /** Milliseconds to cut from the head of the raw recording. */
  trimMs: number;
  /** Seconds to add to clip.start_seconds (punch takes where capture
   * opened after the anchor — that audio can't be trimmed into
   * existence, so the clip moves right instead). */
  clipStartOffsetSec: number;
}

export function computeTakeAlignment(s: TakeStamps): TakeAlignment {
  if (s.transportStartWallMs !== null) {
    // Fresh transport start: timeline position `startSeconds` began
    // sounding when the transport started. Everything captured before
    // that (mic-open dead air) plus the hardware round-trip is head-trim.
    const startupGapMs = Math.max(0, s.transportStartWallMs - s.captureStartWallMs);
    return { trimMs: startupGapMs + s.deviceLatencyMs, clipStartOffsetSec: 0 };
  }

  // Transport already running: the anchor corresponds to press time, but
  // capture went live `lateMs` after it. Net shift = lateness − hardware
  // latency; positive → move the clip right, negative → trim the head.
  const lateMs = Math.max(0, s.captureStartWallMs - s.pressWallMs);
  const netMs = lateMs - s.deviceLatencyMs;
  if (netMs >= 0) return { trimMs: 0, clipStartOffsetSec: netMs / 1000 };
  return { trimMs: -netMs, clipStartOffsetSec: 0 };
}

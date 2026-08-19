// MIDI latency calibration ("tap along with the click").
//
// Why this exists: recorded-MIDI compensation is auto output latency +
// user trim (midiRecord.ts), but WebKit reports outputLatency 0, so on
// Safari/iOS the entire device latency rides on a trim slider the user
// has to tune by ear. The wizard measures it instead: play a steady
// click at known AudioContext times, let the player tap along on the
// keyboard, and compare hardware event timestamps against when each
// click actually reached the output. The median tap offset IS the total
// compensation the capture path needs (true output latency + the
// player's personal feel); trim is set to that minus whatever the
// browser auto-reports, so auto + trim always sums to the measured
// truth on every platform.
//
// This module is the pure math + the tiny wiring registries. The UI
// lives in StudioEditor's MidiLatencyControl; the click itself fires
// through the ENGINE's metronome synths (via the rig below) so the
// calibration signal traverses the exact output chain — master FX,
// mastering, limiter — that the real click does.

// ── Click schedule ───────────────────────────────────────────────────

export interface CalClick {
  ctxSec: number;   // AudioContext time the click is scheduled at
  accent: boolean;  // count-in clicks are accented so the run is audible
  measured: boolean; // count-in clicks are heard but never scored
}

/** 100 BPM: brisk enough that a run stays short, slow enough that the
 * ±half-interval matching window (300ms) dwarfs any real latency. */
export const CAL_INTERVAL_SEC = 0.6;
export const CAL_COUNT_IN = 4;
export const CAL_MEASURED = 16;
/** Lead-in before the first click so all scheduling lands in the future. */
export const CAL_LEAD_IN_SEC = 0.35;

export function buildClickSchedule(startCtxSec: number): CalClick[] {
  const clicks: CalClick[] = [];
  for (let i = 0; i < CAL_COUNT_IN + CAL_MEASURED; i++) {
    clicks.push({
      ctxSec: startCtxSec + i * CAL_INTERVAL_SEC,
      accent: i < CAL_COUNT_IN,
      measured: i >= CAL_COUNT_IN,
    });
  }
  return clicks;
}

// ── Tap → click matching ─────────────────────────────────────────────

/** A tap counts only within this window of a click — beyond it the tap
 * is noise (a chord grace note, a dropped beat), not a timing sample.
 * Half the interval, so a tap can never match two clicks. */
export const CAL_MATCH_WINDOW_MS = (CAL_INTERVAL_SEC * 1000) / 2;

/** Pair taps with clicks (both in performance.now() ms) and return one
 * offset per click that got a tap: tapMs − clickMs, positive = the tap
 * landed after the click reached the output. When several taps fall in
 * one click's window (key + chord tone), the closest wins; each tap
 * scores at most one click. */
export function matchTapOffsets(tapsMs: number[], clicksMs: number[]): number[] {
  const best = new Map<number, number>(); // click index → offset
  for (const tap of tapsMs) {
    let bestIdx = -1;
    let bestOff = Infinity;
    for (let i = 0; i < clicksMs.length; i++) {
      const off = tap - clicksMs[i];
      if (Math.abs(off) < Math.abs(bestOff)) { bestOff = off; bestIdx = i; }
    }
    if (bestIdx < 0 || Math.abs(bestOff) > CAL_MATCH_WINDOW_MS) continue;
    const prev = best.get(bestIdx);
    if (prev === undefined || Math.abs(bestOff) < Math.abs(prev)) best.set(bestIdx, bestOff);
  }
  return [...best.values()];
}

// ── Robust stats ─────────────────────────────────────────────────────

export const CAL_MIN_TAPS = 8;

export interface CalStats {
  /** Median tap offset in ms — the total compensation the capture path
   * needs (true output latency + the player's personal feel). */
  medianMs: number;
  /** Median absolute deviation — tap-to-tap consistency. */
  madMs: number;
  count: number;
  quality: 'good' | 'fair' | 'poor' | 'insufficient';
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Median + MAD instead of mean + stddev: one flubbed beat must not
 * drag the recommendation, and taps are few enough that a single
 * outlier would dominate a mean. */
export function calibrationStats(offsetsMs: number[]): CalStats {
  if (offsetsMs.length < CAL_MIN_TAPS) {
    return { medianMs: 0, madMs: 0, count: offsetsMs.length, quality: 'insufficient' };
  }
  const med = median(offsetsMs);
  const mad = median(offsetsMs.map((o) => Math.abs(o - med)));
  const quality = mad <= 15 ? 'good' : mad <= 30 ? 'fair' : 'poor';
  return { medianMs: med, madMs: mad, count: offsetsMs.length, quality };
}

// ── Trim recommendation ──────────────────────────────────────────────

export interface TrimRecommendation {
  trimMs: number;
  /** True when the measurement exceeded the trim dial's ±100ms range —
   * the applied trim is the clamped edge, and something (wrong output
   * device? Bluetooth?) is likely off. */
  clamped: boolean;
}

/** The capture path compensates by auto (browser-reported output
 * latency, per take) + trim. The measured median is the TOTAL needed,
 * so trim covers whatever auto doesn't — the whole thing on WebKit
 * (auto 0), just the personal residue on Chrome. */
export function recommendedTrim(medianMs: number, autoLatencyMs: number): TrimRecommendation {
  const raw = Math.round(medianMs - autoLatencyMs);
  const trimMs = Math.max(-100, Math.min(100, raw));
  return { trimMs, clamped: trimMs !== raw };
}

// ── Wiring registries ────────────────────────────────────────────────
// The wizard UI lives deep in the audio-settings sheet, far from the
// Editor that owns the engine and the MIDI input stream. Rather than
// threading props through the mic-tester component (which has no
// business knowing about MIDI), the Editor registers here — same
// dependency-free-registry pattern as audioLeakGuard.

export interface CalibrationRig {
  /** Fire one metronome click at an absolute AudioContext time —
   * through the engine's real click synths and output chain. */
  click(accent: boolean, ctxTimeSec: number): void;
  /** Current AudioContext time, seconds. */
  nowCtxSec(): number;
  /** What the capture path's auto compensation will report at record
   * time (engine.getOutputLatencyMs on the live context). */
  autoLatencyMs(): number;
  /** Unlock/resume audio — must be awaited before scheduling clicks. */
  ensureRunning(): Promise<void>;
}

let rig: CalibrationRig | null = null;
export function setCalibrationRig(r: CalibrationRig | null): void { rig = r; }
export function getCalibrationRig(): CalibrationRig | null { return rig; }

type TapListener = (perfMs: number) => void;
const tapListeners = new Set<TapListener>();

/** Editor calls this from its MIDI note-on handler with the event's
 * hardware timestamp (performance.now() domain). Costs a Set-size check
 * when no wizard is listening. */
export function emitCalibrationTap(perfMs: number): void {
  if (tapListeners.size === 0) return;
  for (const fn of tapListeners) fn(perfMs);
}

export function onCalibrationTap(fn: TapListener): () => void {
  tapListeners.add(fn);
  return () => { tapListeners.delete(fn); };
}

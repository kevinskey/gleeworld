// Pure transport logic for the Studio: time-counter formatting, musical
// time math, marker navigation, punch in/out crossing detection,
// pre/post-roll windows, shuttle acceleration, and the loop-wrap guard.
//
// Everything here is side-effect free so it can be unit-tested without
// an AudioContext. The engine + StudioEditor consume these helpers.

// ── Time counters ────────────────────────────────────────────────────

export type CounterMode = 'bars' | 'time' | 'samples';

const COUNTER_ORDER: CounterMode[] = ['bars', 'time', 'samples'];

export function nextCounterMode(mode: CounterMode): CounterMode {
  const i = COUNTER_ORDER.indexOf(mode);
  return COUNTER_ORDER[(i + 1) % COUNTER_ORDER.length];
}

/** M:SS — the classic tape-counter readout. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** BBB.beat.tick at 960 PPQN, 1-based like Logic / Pro Tools. */
export function formatBarBeat(seconds: number, tempoBpm: number, numerator: number): string {
  const secondsPerBeat = 60 / tempoBpm;
  const totalBeats = Math.max(0, seconds) / secondsPerBeat;
  const bar = Math.floor(totalBeats / numerator) + 1;
  const beat = Math.floor(totalBeats % numerator) + 1;
  const ticks = Math.floor((totalBeats % 1) * 960);
  return `${String(bar).padStart(3, '0')}.${beat}.${String(ticks).padStart(3, '0')}`;
}

/** Absolute sample count at the given rate, grouped for readability. */
export function formatSamples(seconds: number, sampleRate: number): string {
  const samples = Math.floor(Math.max(0, seconds) * sampleRate);
  return samples.toLocaleString('en-US');
}

// ── Musical time math ────────────────────────────────────────────────

/** Length of one bar in seconds. The beat is a quarter note scaled by
 * the denominator (6/8 = six eighth-note beats). */
export function barSeconds(tempoBpm: number, numerator: number, denominator: number): number {
  const secondsPerQuarter = 60 / tempoBpm;
  return secondsPerQuarter * numerator * (4 / denominator);
}

/** Where playback should begin so the performer hears `bars` of
 * existing material before the punch-in point. Clamped at zero. */
export function preRollStartSeconds(
  punchInSeconds: number, bars: number,
  tempoBpm: number, numerator: number, denominator: number,
): number {
  return Math.max(0, punchInSeconds - bars * barSeconds(tempoBpm, numerator, denominator));
}

/** Where playback should stop after the punch-out point. */
export function postRollEndSeconds(
  punchOutSeconds: number, bars: number,
  tempoBpm: number, numerator: number, denominator: number,
): number {
  return punchOutSeconds + bars * barSeconds(tempoBpm, numerator, denominator);
}

// ── Markers ──────────────────────────────────────────────────────────

// Canonical marker type lives in the session schema; re-exported here
// so transport consumers don't need a second import.
export type { SessionMarker } from './session';
import type { SessionMarker } from './session';

/** Small window so "jump to previous" from exactly on a marker goes to
 * the one before it instead of re-selecting the marker under the head. */
const MARKER_EPSILON = 0.05;

export function sortMarkers(markers: SessionMarker[]): SessionMarker[] {
  return [...markers].sort((a, b) => a.seconds - b.seconds);
}

export function nextMarker(markers: SessionMarker[], positionSeconds: number): SessionMarker | null {
  const sorted = sortMarkers(markers);
  for (const mk of sorted) {
    if (mk.seconds > positionSeconds + MARKER_EPSILON) return mk;
  }
  return null;
}

export function prevMarker(markers: SessionMarker[], positionSeconds: number): SessionMarker | null {
  const sorted = sortMarkers(markers);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].seconds < positionSeconds - MARKER_EPSILON) return sorted[i];
  }
  return null;
}

export function defaultMarkerName(markers: SessionMarker[]): string {
  return `Marker ${markers.length + 1}`;
}

// ── Punch in / out ───────────────────────────────────────────────────

export interface PunchRange {
  inSeconds: number;
  outSeconds: number;
}

/** Crossing detector fed by consecutive transport positions (~30Hz).
 * 'in'  → the head just crossed the punch-in point moving forward.
 * 'out' → the head just crossed the punch-out point moving forward.
 * Backwards movement (a seek) and a range skipped whole in one tick
 * both return null — a punch never fires off a jump. */
export function punchTransition(
  prevSeconds: number, curSeconds: number, range: PunchRange,
): 'in' | 'out' | null {
  if (curSeconds <= prevSeconds) return null; // paused or seeked backwards
  const { inSeconds, outSeconds } = range;
  if (outSeconds <= inSeconds) return null;
  if (prevSeconds < inSeconds && curSeconds >= inSeconds && curSeconds < outSeconds) return 'in';
  if (prevSeconds >= inSeconds && prevSeconds < outSeconds && curSeconds >= outSeconds) return 'out';
  return null;
}

// ── Shuttle (hold-to-scrub FF / RW) ──────────────────────────────────

/** Seconds of timeline to move per 20ms tick, accelerating with hold
 * time: ~4×/s for the first second, ~12×/s to 2.5s, ~30×/s beyond. */
export function shuttleStepSeconds(heldMs: number): number {
  if (heldMs < 1000) return 0.08;
  if (heldMs < 2500) return 0.24;
  return 0.6;
}

// ── Loop wrap guard ──────────────────────────────────────────────────

export interface LoopWrapInput {
  isPlaying: boolean;
  loopEnabled: boolean;
  /** A recording take is in flight — the wrap watchdog must stand down
   * so a linear take can run straight through the loop region. */
  recordingActive: boolean;
  positionSeconds: number;
  loopStartSeconds: number;
  loopEndSeconds: number;
}

export function shouldLoopWrap(s: LoopWrapInput): boolean {
  return (
    s.isPlaying &&
    s.loopEnabled &&
    !s.recordingActive &&
    s.loopEndSeconds > s.loopStartSeconds &&
    s.positionSeconds >= s.loopEndSeconds
  );
}

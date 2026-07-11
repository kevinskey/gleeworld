// Pure px↔music mapping for the piano roll. All coordinates here are
// CONTENT-space pixels: (0,0) is clip-time 0 at pitch 127's row top.
// The panel translates pointer/scroll/chrome offsets before calling in.

import type { MidiNote } from '@/lib/studio/session';

export interface RollMetrics {
  pxPerSecond: number;
  rowHeight: number;
}

export const PITCH_MAX = 127;
export const ROLL_ROWS = 128;

export const timeToX = (m: RollMetrics, seconds: number): number => seconds * m.pxPerSecond;
export const xToTime = (m: RollMetrics, x: number): number => Math.max(0, x / m.pxPerSecond);
export const pitchToY = (m: RollMetrics, pitch: number): number => (PITCH_MAX - pitch) * m.rowHeight;
export const yToPitch = (m: RollMetrics, y: number): number =>
  Math.max(0, Math.min(PITCH_MAX, PITCH_MAX - Math.floor(y / m.rowHeight)));

export type HitZone = 'left' | 'body' | 'right';

/** Topmost (= last rendered = highest index) note under the point.
 * Edge zones only exist when the note is wide enough that grabbing an
 * edge can't be an accidental body-grab. */
export function hitTestNote(
  m: RollMetrics, notes: MidiNote[], x: number, y: number, edgePx = 5,
): { index: number; zone: HitZone } | null {
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    const x0 = timeToX(m, n.start_seconds);
    const x1 = timeToX(m, n.start_seconds + n.duration_seconds);
    const y0 = pitchToY(m, n.pitch);
    if (y < y0 || y >= y0 + m.rowHeight || x < x0 || x > x1) continue;
    if (x1 - x0 > edgePx * 3) {
      if (x <= x0 + edgePx) return { index: i, zone: 'left' };
      if (x >= x1 - edgePx) return { index: i, zone: 'right' };
    }
    return { index: i, zone: 'body' };
  }
  return null;
}

/** Indices of notes intersecting the (any-corner-order) rect. */
export function notesInRect(
  m: RollMetrics, notes: MidiNote[], r: { x0: number; y0: number; x1: number; y1: number },
): number[] {
  const [xa, xb] = r.x0 <= r.x1 ? [r.x0, r.x1] : [r.x1, r.x0];
  const [ya, yb] = r.y0 <= r.y1 ? [r.y0, r.y1] : [r.y1, r.y0];
  const out: number[] = [];
  notes.forEach((n, i) => {
    const nx0 = timeToX(m, n.start_seconds);
    const nx1 = timeToX(m, n.start_seconds + n.duration_seconds);
    const ny0 = pitchToY(m, n.pitch);
    if (nx1 >= xa && nx0 <= xb && ny0 + m.rowHeight >= ya && ny0 <= yb) out.push(i);
  });
  return out;
}

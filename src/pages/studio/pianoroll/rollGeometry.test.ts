import { describe, it, expect } from 'vitest';
import { timeToX, xToTime, pitchToY, yToPitch, hitTestNote, notesInRect } from './rollGeometry';
import type { MidiNote } from '@/lib/studio/session';

const m = { pxPerSecond: 100, rowHeight: 12 };
const note = (pitch: number, start: number, dur: number): MidiNote =>
  ({ pitch, velocity: 100, start_seconds: start, duration_seconds: dur });

describe('rollGeometry', () => {
  it('maps time and pitch both ways', () => {
    expect(timeToX(m, 1.5)).toBe(150);
    expect(xToTime(m, 150)).toBeCloseTo(1.5);
    expect(xToTime(m, -10)).toBe(0);
    expect(pitchToY(m, 127)).toBe(0);
    expect(pitchToY(m, 60)).toBe((127 - 60) * 12);
    expect(yToPitch(m, 5)).toBe(127);
    expect(yToPitch(m, (127 - 60) * 12 + 6)).toBe(60);
    expect(yToPitch(m, 99999)).toBe(0);
  });

  it('hit-tests body and edges, topmost note first', () => {
    const notes = [note(60, 1, 1), note(60, 1, 1)];
    const y = pitchToY(m, 60) + 6;
    expect(hitTestNote(m, notes, 150, y)).toEqual({ index: 1, zone: 'body' });
    expect(hitTestNote(m, notes, 102, y)).toEqual({ index: 1, zone: 'left' });
    expect(hitTestNote(m, notes, 198, y)).toEqual({ index: 1, zone: 'right' });
    expect(hitTestNote(m, notes, 150, y + 12)).toBeNull();
    expect(hitTestNote(m, notes, 300, y)).toBeNull();
  });

  it('tiny notes are all body (edges need width)', () => {
    const notes = [note(60, 1, 0.05)]; // 5px wide at 100px/s
    expect(hitTestNote(m, notes, 101, pitchToY(m, 60) + 6)?.zone).toBe('body');
  });

  it('marquee returns intersecting notes with a normalized rect', () => {
    const notes = [note(60, 0, 1), note(62, 2, 1), note(64, 5, 1)];
    const y60 = pitchToY(m, 60), y62 = pitchToY(m, 62);
    expect(notesInRect(m, notes, { x0: 250, y0: y60 + 11, x1: 50, y1: y62 + 1 })).toEqual([0, 1]);
  });
});

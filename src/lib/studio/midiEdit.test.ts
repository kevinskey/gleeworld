import { describe, it, expect } from 'vitest';
import {
  applySustain,
  gridSeconds, quantizeNotes, transposeNotes, moveNotes, resizeNotes,
  offsetVelocity, addNote, deleteNotes, sustainRanges, setSustainRanges,
  trimNotesToDuration,
} from './midiEdit';
import type { MidiNote, MidiCcEvent } from './session';

const note = (pitch: number, start: number, dur: number, vel = 100): MidiNote =>
  ({ pitch, velocity: vel, start_seconds: start, duration_seconds: dur });
const cc64 = (t: number, down: boolean): MidiCcEvent =>
  ({ controller: 64, value: down ? 127 : 0, time_seconds: t });

describe('applySustain', () => {
  it('passes notes through untouched with no cc (legacy clips)', () => {
    const notes = [note(60, 0, 0.5)];
    expect(applySustain(notes, [])).toEqual(notes);
    expect(applySustain(notes, [{ controller: 1, value: 64, time_seconds: 0 }])).toEqual(notes);
  });

  it('extends a note released while the pedal is down until pedal-up', () => {
    const out = applySustain([note(60, 0, 0.5)], [cc64(0.2, true), cc64(2.0, false)]);
    expect(out[0].duration_seconds).toBeCloseTo(2.0);
  });

  it('leaves a note alone when the pedal lifted before its key-up', () => {
    const out = applySustain([note(60, 0, 1.0)], [cc64(0.1, true), cc64(0.5, false)]);
    expect(out[0].duration_seconds).toBeCloseTo(1.0);
  });

  it('clamps a sustained note at the next re-strike of the same pitch', () => {
    const out = applySustain(
      [note(60, 0, 0.3), note(60, 1.0, 0.3)],
      [cc64(0.1, true), cc64(3.0, false)],
    );
    expect(out[0].duration_seconds).toBeCloseTo(1.0); // ends at the re-strike
    expect(out[1].duration_seconds).toBeCloseTo(2.0); // rides to pedal-up
  });

  it('pedal never lifted: extends to the end of the material', () => {
    const out = applySustain([note(60, 0, 0.4), note(64, 1.0, 0.6)], [cc64(0.1, true)]);
    expect(out[0].duration_seconds).toBeCloseTo(1.6); // last note end
  });
});

describe('gridSeconds', () => {
  it('derives straight and triplet grids from tempo', () => {
    expect(gridSeconds('1/4', 120)).toBeCloseTo(0.5);
    expect(gridSeconds('1/16', 120)).toBeCloseTo(0.125);
    expect(gridSeconds('1/8T', 120)).toBeCloseTo(0.5 / 3);
  });
});

describe('quantizeNotes', () => {
  it('hard-snaps selected notes to the TIMELINE grid (clip offset honored)', () => {
    // Clip starts mid-bar at 0.3s; a note at clip-relative 0.15 sits at
    // absolute 0.45 → nearest 0.5 gridline → clip-relative 0.2.
    const out = quantizeNotes([note(60, 0.15, 0.2)], [0],
      { gridSeconds: 0.5, strength: 1, clipStartSeconds: 0.3 });
    expect(out[0].start_seconds).toBeCloseTo(0.2);
  });
  it('strength moves notes only part-way', () => {
    const out = quantizeNotes([note(60, 0.15, 0.2)], [0],
      { gridSeconds: 0.5, strength: 0.5, clipStartSeconds: 0.3 });
    expect(out[0].start_seconds).toBeCloseTo(0.175); // half of the 0.05 correction
  });
  it('never moves unselected notes, and clamps at clip start', () => {
    // Unselected note (index 0) must not move.
    const out = quantizeNotes([note(60, 0.15, 0.2), note(62, 0.6, 0.2)], [1],
      { gridSeconds: 0.5, strength: 1, clipStartSeconds: 0 });
    expect(out[0].start_seconds).toBeCloseTo(0.15);
    expect(out[1].start_seconds).toBeCloseTo(0.5);
    // A clip starting at 0.4 with a note at rel 0.05 (abs 0.45 → grid 0.5)
    // snaps to rel 0.1; but a grid target BEFORE the clip start clamps to 0:
    // abs 0.45 with grid 2.0 → target 0.0 → rel would be −0.4 → clamped 0.
    const clamped = quantizeNotes([note(60, 0.05, 0.2)], [0],
      { gridSeconds: 2.0, strength: 1, clipStartSeconds: 0.4 });
    expect(clamped[0].start_seconds).toBe(0);
  });
});

describe('note ops', () => {
  it('transpose clamps to 0..127', () => {
    const out = transposeNotes([note(126, 0, 1), note(1, 0, 1)], [0, 1], 12);
    expect(out[0].pitch).toBe(127);
    expect(out[1].pitch).toBe(13);
  });
  it('move shifts time+pitch with grid snap and floors at 0', () => {
    const out = moveNotes([note(60, 1.0, 0.5)], [0],
      { deltaSeconds: 0.26, deltaSemitones: -2, gridSeconds: 0.25, clipStartSeconds: 0 });
    expect(out[0].start_seconds).toBeCloseTo(1.25);
    expect(out[0].pitch).toBe(58);
  });
  it('resize right enforces the minimum duration', () => {
    const out = resizeNotes([note(60, 0, 0.5)], [0],
      { edge: 'right', deltaSeconds: -0.49, gridSeconds: 0, clipStartSeconds: 0 });
    expect(out[0].duration_seconds).toBeCloseTo(0.05);
  });
  it('resize left moves start and preserves the end', () => {
    const out = resizeNotes([note(60, 1.0, 0.5)], [0],
      { edge: 'left', deltaSeconds: 0.2, gridSeconds: 0, clipStartSeconds: 0 });
    expect(out[0].start_seconds).toBeCloseTo(1.2);
    expect(out[0].duration_seconds).toBeCloseTo(0.3);
  });
  it('resize left enforces minimum duration floor', () => {
    const out = resizeNotes([note(60, 0, 0.02)], [0],
      { edge: 'left', deltaSeconds: 0.001, gridSeconds: 0, clipStartSeconds: 0 });
    expect(out[0].duration_seconds).toBeGreaterThanOrEqual(0.05);
  });
  it('velocity offset clamps 1..127', () => {
    const out = offsetVelocity([note(60, 0, 1, 120), note(62, 0, 1, 3)], [0, 1], 20);
    expect(out[0].velocity).toBe(127);
    expect(out[1].velocity).toBe(23);
  });
  it('add returns the new index; delete filters the selection', () => {
    const { notes, index } = addNote([note(60, 0, 1)], note(64, 1, 1));
    expect(index).toBe(1);
    expect(deleteNotes(notes, [0])).toEqual([note(64, 1, 1)]);
  });
});

describe('sustain ranges', () => {
  it('pairs down/up events into ranges (open range ends at fallbackEnd)', () => {
    expect(sustainRanges([cc64(1, true), cc64(2, false), cc64(3, true)], 5))
      .toEqual([{ down: 1, up: 2 }, { down: 3, up: 5 }]);
  });
  it('setSustainRanges rebuilds CC64 and keeps other controllers', () => {
    const mod = { controller: 1, value: 30, time_seconds: 0.5 };
    const out = setSustainRanges([cc64(1, true), cc64(2, false), mod], [{ down: 0.5, up: 1.5 }]);
    expect(out).toEqual([mod, cc64(0.5, true), cc64(1.5, false)].sort((a, b) => a.time_seconds - b.time_seconds));
  });
  it('setSustainRanges merges overlapping ranges', () => {
    const cc = setSustainRanges([], [{ down: 1, up: 3 }, { down: 2, up: 4 }]);
    const ranges = sustainRanges(cc, 10);
    expect(ranges).toEqual([{ down: 1, up: 4 }]);
  });
});

describe('trimNotesToDuration', () => {
  const n = (start: number, dur: number) => ({ pitch: 60, velocity: 100, start_seconds: start, duration_seconds: dur });
  it('drops notes starting at/after the new end', () => {
    expect(trimNotesToDuration([n(0, 1), n(2, 1)], 2)).toHaveLength(1);
  });
  it('truncates straddlers', () => {
    const out = trimNotesToDuration([n(1, 4)], 2);
    expect(out[0].duration_seconds).toBe(1);
  });
  it('floors truncation at MIN_NOTE_SECONDS and keeps identity of untouched notes', () => {
    const keep = n(0, 0.5);
    const out = trimNotesToDuration([keep, n(1.999, 1)], 2);
    expect(out[0]).toBe(keep);
    expect(out[1].duration_seconds).toBeGreaterThan(0);
  });
});

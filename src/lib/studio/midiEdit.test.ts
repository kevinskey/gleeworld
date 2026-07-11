import { describe, it, expect } from 'vitest';
import { applySustain } from './midiEdit';
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

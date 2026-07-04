// MIDI Clock output — 24 PPQ realtime clock plus Start/Continue/Stop
// and Song Position Pointer, sent to a Web MIDI output so hardware and
// other DAWs can chase the Studio transport.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MidiClockSender, songPositionBytes,
  MIDI_CLOCK, MIDI_START, MIDI_CONTINUE, MIDI_STOP, MIDI_SPP,
} from '../midiClock';

function fakeOutput() {
  const sent: number[][] = [];
  return { sent, send: (data: number[] | Uint8Array) => sent.push([...data]) };
}

describe('songPositionBytes', () => {
  it('is zero at the top of the song', () => {
    expect(songPositionBytes(0, 120)).toEqual([MIDI_SPP, 0, 0]);
  });
  it('counts MIDI beats (16th notes) from seconds + BPM', () => {
    // 2s at 120 BPM = 4 quarter notes = 16 sixteenths
    expect(songPositionBytes(2, 120)).toEqual([MIDI_SPP, 16, 0]);
  });
  it('splits into 7-bit LSB/MSB', () => {
    // 3000 sixteenths → lsb 3000 % 128 = 56, msb 3000 >> 7 = 23
    expect(songPositionBytes(375, 120)).toEqual([MIDI_SPP, 56, 23]);
  });
});

describe('MidiClockSender', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sends SPP + Start from zero, then 24 PPQ clock ticks', () => {
    const out = fakeOutput();
    const clock = new MidiClockSender(out, 120);
    clock.start(0);
    expect(out.sent[0]).toEqual([MIDI_SPP, 0, 0]);
    expect(out.sent[1]).toEqual([MIDI_START]);
    vi.advanceTimersByTime(1000); // 2 beats at 120 BPM → 48 ticks
    const ticks = out.sent.filter((b) => b[0] === MIDI_CLOCK).length;
    expect(ticks).toBe(48);
    clock.dispose();
  });

  it('sends Continue instead of Start when resuming mid-song', () => {
    const out = fakeOutput();
    const clock = new MidiClockSender(out, 120);
    clock.start(2);
    expect(out.sent[0]).toEqual([MIDI_SPP, 16, 0]);
    expect(out.sent[1]).toEqual([MIDI_CONTINUE]);
    clock.dispose();
  });

  it('sends Stop and halts the tick stream', () => {
    const out = fakeOutput();
    const clock = new MidiClockSender(out, 120);
    clock.start(0);
    vi.advanceTimersByTime(500);
    clock.stop();
    expect(out.sent[out.sent.length - 1]).toEqual([MIDI_STOP]);
    const before = out.sent.length;
    vi.advanceTimersByTime(1000);
    expect(out.sent.length).toBe(before);
    clock.dispose();
  });

  it('retimes the tick stream when the tempo changes mid-run', () => {
    const out = fakeOutput();
    const clock = new MidiClockSender(out, 60); // 24 ticks/s
    clock.start(0);
    vi.advanceTimersByTime(1000);
    const at60 = out.sent.filter((b) => b[0] === MIDI_CLOCK).length;
    expect(at60).toBe(24);
    clock.setBpm(120); // 48 ticks/s
    vi.advanceTimersByTime(1000);
    const total = out.sent.filter((b) => b[0] === MIDI_CLOCK).length;
    expect(total).toBe(24 + 48);
    clock.dispose();
  });
});

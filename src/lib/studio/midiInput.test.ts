import { describe, it, expect } from 'vitest';
import { parseMidiMessage } from './midiMessage';
import { captureNote, findMidiClipAt, recordStartMode } from './midiRecord';
import type { MidiClip } from './session';

describe('parseMidiMessage', () => {
  it('reads note-on (status 0x9n, velocity > 0)', () => {
    expect(parseMidiMessage([0x90, 60, 100])).toEqual({ type: 'noteon', pitch: 60, velocity: 100 });
    expect(parseMidiMessage([0x95, 72, 64])).toEqual({ type: 'noteon', pitch: 72, velocity: 64 }); // channel 5
  });

  it('reads note-off (status 0x8n)', () => {
    expect(parseMidiMessage([0x80, 60, 0])).toEqual({ type: 'noteoff', pitch: 60 });
  });

  it('treats note-on with velocity 0 as a note-off (running status)', () => {
    expect(parseMidiMessage([0x90, 60, 0])).toEqual({ type: 'noteoff', pitch: 60 });
  });

  it('classifies control/other messages as other', () => {
    expect(parseMidiMessage([0xb0, 7, 100])).toEqual({ type: 'other' }); // CC
    expect(parseMidiMessage([0xf8])).toEqual({ type: 'other' });          // clock
    expect(parseMidiMessage([])).toEqual({ type: 'other' });
  });
});

describe('captureNote', () => {
  it('converts absolute key down/up into a clip-relative note', () => {
    const n = captureNote(60, 100, 5.0, 5.75, 4.0); // clip starts at 4s
    expect(n).toEqual({ pitch: 60, velocity: 100, start_seconds: 1.0, duration_seconds: 0.75 });
  });

  it('floors a very short tap to a minimum audible length', () => {
    const n = captureNote(64, 80, 2.0, 2.001, 2.0);
    expect(n.start_seconds).toBe(0);
    expect(n.duration_seconds).toBeGreaterThanOrEqual(0.05);
  });

  it('never produces a negative start when the note precedes the clip', () => {
    expect(captureNote(60, 100, 3.9, 4.2, 4.0).start_seconds).toBe(0);
  });
});

describe('findMidiClipAt', () => {
  const clips: MidiClip[] = [
    { id: 'a', kind: 'midi', start_seconds: 0, duration_seconds: 4, notes: [] } as MidiClip,
    { id: 'b', kind: 'midi', start_seconds: 8, duration_seconds: 4, notes: [] } as MidiClip,
  ];
  it('returns the clip under the playhead', () => {
    expect(findMidiClipAt(clips, 2)?.id).toBe('a');
    expect(findMidiClipAt(clips, 9)?.id).toBe('b');
  });
  it('returns null in empty space (caller starts a fresh clip)', () => {
    expect(findMidiClipAt(clips, 6)).toBeNull();
    expect(findMidiClipAt(clips, 4)).toBeNull(); // end-exclusive
  });
});

describe('recordStartMode', () => {
  const base = { armedAudioCount: 0, midiInputEnabled: false, hasMidiTarget: false, nativeEngine: false };

  it('records audio whenever an audio track is armed (MIDI capture rides along)', () => {
    expect(recordStartMode({ ...base, armedAudioCount: 1 })).toBe('audio');
    expect(recordStartMode({ ...base, armedAudioCount: 2, midiInputEnabled: true, hasMidiTarget: true })).toBe('audio');
    expect(recordStartMode({ ...base, armedAudioCount: 1, nativeEngine: true })).toBe('audio');
  });

  it('records a MIDI-only take when no audio is armed but MIDI input has a target', () => {
    expect(recordStartMode({ ...base, midiInputEnabled: true, hasMidiTarget: true })).toBe('midi');
  });

  it('blocks when nothing is armed and MIDI input is off', () => {
    expect(recordStartMode(base)).toBe('blocked');
    expect(recordStartMode({ ...base, hasMidiTarget: true })).toBe('blocked');
  });

  it('blocks a MIDI-only take when there is no MIDI track to capture into', () => {
    expect(recordStartMode({ ...base, midiInputEnabled: true })).toBe('blocked');
  });

  it('blocks a MIDI-only take on the native engine (web-only input path)', () => {
    expect(recordStartMode({ ...base, midiInputEnabled: true, hasMidiTarget: true, nativeEngine: true })).toBe('blocked');
  });
});

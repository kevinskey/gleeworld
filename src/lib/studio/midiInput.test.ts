import { describe, it, expect } from 'vitest';
import { parseMidiMessage } from './midiMessage';
import { SustainTracker } from './midiSustain';
import { appendTakeNote, captureNote, findMidiClipAt, recordStartMode } from './midiRecord';
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
    expect(parseMidiMessage([0xb0, 7, 100])).toEqual({ type: 'other' }); // CC volume
    expect(parseMidiMessage([0xf8])).toEqual({ type: 'other' });          // clock
    expect(parseMidiMessage([])).toEqual({ type: 'other' });
  });

  it('reads the sustain pedal (CC64) on any channel, down at value >= 64', () => {
    expect(parseMidiMessage([0xb0, 64, 127])).toEqual({ type: 'sustain', down: true });
    expect(parseMidiMessage([0xb2, 64, 64])).toEqual({ type: 'sustain', down: true });  // channel 2 (WP06 broadcasts 1-3)
    expect(parseMidiMessage([0xb0, 64, 0])).toEqual({ type: 'sustain', down: false });
    expect(parseMidiMessage([0xb1, 64, 63])).toEqual({ type: 'sustain', down: false });
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

describe('appendTakeNote', () => {
  const note = (down: number, up: number) => ({ pitch: 60, velocity: 100, downAbsSeconds: down, upAbsSeconds: up });

  it('starts a fresh clip at the first key-down of a take in empty space', () => {
    const r = appendTakeNote([], null, note(5, 5.5), 'fresh');
    expect(r.takeClipId).toBe('fresh');
    expect(r.clips).toHaveLength(1);
    expect(r.clips[0].start_seconds).toBe(5);
    expect(r.clips[0].notes).toHaveLength(1);
  });

  it('keeps ONE clip per take — later notes extend it instead of spawning clips', () => {
    const first = appendTakeNote([], null, note(5, 5.5), 'fresh');
    // Second note lands well past the first clip's end (5 + 1s min duration).
    const second = appendTakeNote(first.clips, first.takeClipId, note(9, 9.5), 'unused');
    expect(second.clips).toHaveLength(1);
    expect(second.takeClipId).toBe('fresh');
    expect(second.clips[0].notes).toHaveLength(2);
    // Clip grew to cover the new note's end (9.5 abs = 4.5 clip-relative).
    expect(second.clips[0].duration_seconds).toBeCloseTo(4.5, 5);
    // Note is clip-relative to the take clip's start.
    expect(second.clips[0].notes[1].start_seconds).toBeCloseTo(4, 5);
  });

  it('adopts the clip under the first key-down (overdub) and grows it as the take runs on', () => {
    const existing: MidiClip[] = [
      { id: 'old', kind: 'midi', start_seconds: 2, duration_seconds: 4, notes: [] } as MidiClip,
    ];
    const first = appendTakeNote(existing, null, note(3, 3.5), 'unused');
    expect(first.takeClipId).toBe('old');
    const second = appendTakeNote(first.clips, first.takeClipId, note(10, 11), 'unused');
    expect(second.clips).toHaveLength(1);
    expect(second.clips[0].id).toBe('old');
    expect(second.clips[0].duration_seconds).toBeCloseTo(9, 5); // grew from 4 to cover 11 abs
    expect(second.clips[0].notes).toHaveLength(2);
  });

  it('leaves other clips untouched', () => {
    const other: MidiClip = { id: 'other', kind: 'midi', start_seconds: 20, duration_seconds: 2, notes: [] } as MidiClip;
    const r1 = appendTakeNote([other], null, note(5, 5.5), 'fresh');
    const r2 = appendTakeNote(r1.clips, r1.takeClipId, note(7, 8), 'unused');
    expect(r2.clips).toHaveLength(2);
    expect(r2.clips.find((c) => c.id === 'other')).toEqual(other);
  });

  it('never shrinks a clip when a short note lands inside it', () => {
    const first = appendTakeNote([], null, note(5, 12), 'fresh'); // long note → 7s clip
    const second = appendTakeNote(first.clips, first.takeClipId, note(6, 6.2), 'unused');
    expect(second.clips[0].duration_seconds).toBeCloseTo(7, 5);
  });
});


describe('SustainTracker', () => {
  it('commits a normal press on key-up when the pedal is up', () => {
    const t = new SustainTracker();
    expect(t.keyDown(60, 100, 1.0)).toBeNull();
    expect(t.keyUp(60)).toEqual({ pitch: 60, velocity: 100, downAbsSeconds: 1.0 });
  });

  it('holds a released key while the pedal is down and commits it on pedal-up', () => {
    const t = new SustainTracker();
    t.setPedal(true);
    t.keyDown(60, 100, 1.0);
    expect(t.keyUp(60)).toBeNull();                       // pedal is holding it
    expect(t.setPedal(false)).toEqual([{ pitch: 60, velocity: 100, downAbsSeconds: 1.0 }]);
    expect(t.setPedal(false)).toEqual([]);                // idempotent
  });

  it('ignores duplicate pedal-down messages (WP06 sends the pedal on 3 channels)', () => {
    const t = new SustainTracker();
    expect(t.setPedal(true)).toEqual([]);
    expect(t.setPedal(true)).toEqual([]);
    expect(t.setPedal(true)).toEqual([]);
    t.keyDown(60, 90, 2.0);
    t.keyUp(60);
    expect(t.setPedal(false)).toHaveLength(1);
  });

  it('re-striking a sustained pitch commits the old press first', () => {
    const t = new SustainTracker();
    t.setPedal(true);
    t.keyDown(60, 100, 1.0);
    t.keyUp(60);                                          // sustained
    expect(t.keyDown(60, 80, 3.0)).toEqual({ pitch: 60, velocity: 100, downAbsSeconds: 1.0 });
    t.keyUp(60);                                          // second press sustained now
    expect(t.setPedal(false)).toEqual([{ pitch: 60, velocity: 80, downAbsSeconds: 3.0 }]);
  });

  it('flush commits everything still held or sustained (record stop)', () => {
    const t = new SustainTracker();
    t.setPedal(true);
    t.keyDown(60, 100, 1.0);
    t.keyUp(60);                                          // sustained
    t.keyDown(64, 90, 2.0);                               // still held
    const flushed = t.flush();
    expect(flushed.map((p) => p.pitch).sort()).toEqual([60, 64]);
    expect(t.flush()).toEqual([]);                        // empty after
    expect(t.setPedal(false)).toEqual([]);                // nothing left for the pedal
  });

  it('key-up for an untracked pitch and pedal moves with nothing held are no-ops', () => {
    const t = new SustainTracker();
    expect(t.keyUp(60)).toBeNull();
    expect(t.setPedal(true)).toEqual([]);
    expect(t.setPedal(false)).toEqual([]);
  });
});

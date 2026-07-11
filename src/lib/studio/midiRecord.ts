import type { MidiClip, MidiNote } from './session';

// The clip under the playhead on a MIDI track, or null if the playhead sits in
// empty space (the caller then starts a fresh clip).
export function findMidiClipAt(clips: MidiClip[], posSeconds: number): MidiClip | null {
  return clips.find((c) => posSeconds >= c.start_seconds && posSeconds < c.start_seconds + c.duration_seconds) ?? null;
}

const MIN_NOTE_SECONDS = 0.05; // floor so a fast tap still has audible length

// Turn a captured key press (absolute transport seconds for down/up) into a
// clip-relative MidiNote. Pure — the timing math is unit-tested.
export function captureNote(
  pitch: number,
  velocity: number,
  downAbsSeconds: number,
  upAbsSeconds: number,
  clipStartSeconds: number,
): MidiNote {
  return {
    pitch,
    velocity,
    start_seconds: Math.max(0, downAbsSeconds - clipStartSeconds),
    duration_seconds: Math.max(MIN_NOTE_SECONDS, upAbsSeconds - downAbsSeconds),
  };
}

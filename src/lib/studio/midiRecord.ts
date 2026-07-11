import type { MidiClip, MidiNote } from './session';

// The clip under the playhead on a MIDI track, or null if the playhead sits in
// empty space (the caller then starts a fresh clip).
export function findMidiClipAt(clips: MidiClip[], posSeconds: number): MidiClip | null {
  return clips.find((c) => posSeconds >= c.start_seconds && posSeconds < c.start_seconds + c.duration_seconds) ?? null;
}

// What pressing ● should do given what's armed. Armed audio always wins the
// classic mic take (MIDI capture rides along via recordingActive); with no
// armed audio, a MIDI-only take runs when the USB input has a track to write
// into — web engine only, matching useStudioMidiInput's enabled gate.
export type RecordStartMode = 'audio' | 'midi' | 'blocked';

export function recordStartMode(opts: {
  armedAudioCount: number;
  midiInputEnabled: boolean;
  hasMidiTarget: boolean;
  nativeEngine: boolean;
}): RecordStartMode {
  if (opts.armedAudioCount > 0) return 'audio';
  if (opts.midiInputEnabled && opts.hasMidiTarget && !opts.nativeEngine) return 'midi';
  return 'blocked';
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

// Commit one captured key press into a take, keeping ONE clip per recording
// take: the first note either adopts the clip under its key-down (overdub) or
// starts a fresh one (`newClipId`), and every later note of the same take
// appends to that clip and grows it — committing per-note used to spawn a new
// clip for each note that landed past the previous clip's edge.
export function appendTakeNote(
  clips: MidiClip[],
  takeClipId: string | null,
  press: { pitch: number; velocity: number; downAbsSeconds: number; upAbsSeconds: number },
  newClipId: string,
): { clips: MidiClip[]; takeClipId: string } {
  const target = (takeClipId ? clips.find((c) => c.id === takeClipId) : null)
    ?? findMidiClipAt(clips, press.downAbsSeconds);
  if (target) {
    const note = captureNote(press.pitch, press.velocity, press.downAbsSeconds, press.upAbsSeconds, target.start_seconds);
    const noteEnd = note.start_seconds + note.duration_seconds;
    return {
      takeClipId: target.id,
      clips: clips.map((c) => c.id === target.id
        ? { ...c, notes: [...c.notes, note], duration_seconds: Math.max(c.duration_seconds, noteEnd) }
        : c),
    };
  }
  const note = captureNote(press.pitch, press.velocity, press.downAbsSeconds, press.upAbsSeconds, press.downAbsSeconds);
  const clip: MidiClip = {
    id: newClipId, kind: 'midi',
    start_seconds: press.downAbsSeconds,
    duration_seconds: Math.max(1, note.start_seconds + note.duration_seconds),
    notes: [note],
  };
  return { takeClipId: clip.id, clips: [...clips, clip] };
}

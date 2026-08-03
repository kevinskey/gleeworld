import type { MidiClip, MidiNote, MidiCcEvent } from './session';

// The clip under the playhead on a MIDI track, or null if the playhead sits in
// empty space (the caller then starts a fresh clip).
export function findMidiClipAt(clips: MidiClip[], posSeconds: number): MidiClip | null {
  return clips.find((c) => posSeconds >= c.start_seconds && posSeconds < c.start_seconds + c.duration_seconds) ?? null;
}

// What pressing ● should do given what's armed. Armed audio always wins the
// classic mic take (MIDI capture rides along via recordingActive); with no
// armed audio, a MIDI-only take runs when the MIDI input has a track to
// write into — on both engines (the native/iOS transport records MIDI too).
export type RecordStartMode = 'audio' | 'midi' | 'blocked';

export function recordStartMode(opts: {
  armedAudioCount: number;
  midiInputEnabled: boolean;
  hasMidiTarget: boolean;
}): RecordStartMode {
  if (opts.armedAudioCount > 0) return 'audio';
  if (opts.midiInputEnabled && opts.hasMidiTarget) return 'midi';
  return 'blocked';
}

// Declared session length after a take that may have run past the grid —
// grow (never shrink) so the transport doesn't stop before the take's tail
// on the next playback. Whole seconds, matching the audio-take path.
export function grownSessionLength(currentSeconds: number, takeEndSeconds: number): number {
  return Math.max(currentSeconds, Math.ceil(takeEndSeconds));
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

// ── Held-note bookkeeping (recording) ────────────────────────────────
// Since schema 1.1.0 the sustain pedal is recorded as CC64 events, so
// recorded notes carry their TRUE key-up duration — the pedal no longer
// holds presses open (that behavior lives in applySustain at playback,
// and in LiveVoices for live monitoring). This replaces the old
// held+sustained pedal-tracking approach.

export interface HeldPress {
  pitch: number;
  velocity: number;
  downAbsSeconds: number;
}

export class HeldNotes {
  private held = new Map<number, HeldPress>();
  /** Track a key-down. Returns a stale press to commit when a note-off
   * was missed for this pitch, else null. */
  keyDown(pitch: number, velocity: number, atSeconds: number): HeldPress | null {
    const stale = this.held.get(pitch) ?? null;
    this.held.set(pitch, { pitch, velocity, downAbsSeconds: atSeconds });
    return stale;
  }
  keyUp(pitch: number): HeldPress | null {
    const press = this.held.get(pitch) ?? null;
    this.held.delete(pitch);
    return press;
  }
  /** Record stop: commit everything still physically held. */
  flush(): HeldPress[] {
    const commits = [...this.held.values()];
    this.held.clear();
    return commits;
  }
}

// ── CC capture ───────────────────────────────────────────────────────

export interface CapturedCc { controller: number; value: number; timeAbsSeconds: number; }

/** Fold a take's captured CC events into the take clip: clip-relative
 * times (clamped ≥ 0), merged with any existing cc (overdub), sorted;
 * the clip grows to cover a trailing event (e.g. a pedal-up after the
 * last key-up). CC captured with no take clip is dropped by the caller. */
export function attachTakeCc(clips: MidiClip[], takeClipId: string, events: CapturedCc[]): MidiClip[] {
  if (events.length === 0) return clips;
  return clips.map((c) => {
    if (c.id !== takeClipId) return c;
    const rel: MidiCcEvent[] = events.map((e) => ({
      controller: e.controller, value: e.value,
      time_seconds: Math.max(0, e.timeAbsSeconds - c.start_seconds),
    }));
    const cc = [...(c.cc ?? []), ...rel].sort((a, b) => a.time_seconds - b.time_seconds);
    const last = cc[cc.length - 1].time_seconds;
    return { ...c, cc, duration_seconds: Math.max(c.duration_seconds, last) };
  });
}

// ── Commit coalescing queue ──────────────────────────────────────────

export interface MidiCommitQueue<T> {
  add(item: T): void;        // starts/extends the coalesce timer
  flushNow(): T[];           // cancel timer, drain, return items
  clear(): void;             // cancel timer, drop items — "leave no trace"
  size(): number;
}

/** Coalescing commit queue for captured MIDI presses. StudioEditor batches
 * note commits ~250ms so chords land as one manifest write; punch-cancel
 * must be able to discard the batch entirely ("leave no trace"). */
export function createMidiCommitQueue<T>(opts: {
  coalesceMs: number;
  onFlush: (items: T[]) => void;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}): MidiCommitQueue<T> {
  const setT = opts.setTimer ?? setTimeout;
  const clearT = opts.clearTimer ?? clearTimeout;
  let items: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => { if (timer !== null) { clearT(timer); timer = null; } };
  const drain = () => { const out = items; items = []; return out; };
  return {
    add(item) {
      items.push(item);
      if (timer === null) timer = setT(() => { timer = null; opts.onFlush(drain()); }, opts.coalesceMs);
    },
    flushNow() { cancel(); const out = drain(); if (out.length) opts.onFlush(out); return out; },
    clear() { cancel(); items = []; },
    size() { return items.length; },
  };
}

// ── MIDI recording offset (auto + trim) ──────────────────────────────
// The player performs in time with what they HEAR, which is late by the
// audio output latency — so captured event times are shifted earlier by
// getOutputLatencyMs() (read once per take by the caller) plus this
// user trim. Mirrors the audio path's takeAlignment approach.

export const MIDI_TRIM_STORAGE_KEY = 'studio.midiTrimMs';

export function getMidiTrimMs(): number {
  if (typeof localStorage === 'undefined') return 0;
  const raw = localStorage.getItem(MIDI_TRIM_STORAGE_KEY);
  if (raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(-100, Math.min(100, n)) : 0;
}

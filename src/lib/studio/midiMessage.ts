// Pure parser for Web MIDI input messages. Kept free of any Web Audio / DOM so
// it can be unit-tested. Handles the events we act on — note on / note off /
// sustain pedal — and reports everything else as 'other' (CC, pitch bend,
// clock, etc.).

export type MidiEvent =
  | { type: 'noteon'; pitch: number; velocity: number }   // velocity 1..127
  | { type: 'noteoff'; pitch: number }
  | { type: 'sustain'; down: boolean }                    // CC64, down at >= 64
  | { type: 'cc'; controller: number; value: number }     // CC1 (mod wheel) for now
  | { type: 'other' };

export function parseMidiMessage(data: ArrayLike<number>): MidiEvent {
  if (data.length < 1) return { type: 'other' };
  const status = data[0] & 0xf0; // strip channel (low nibble)
  const pitch = data[1] ?? 0;
  const velocity = data[2] ?? 0;

  // 0x90 = note on, 0x80 = note off. A note-on with velocity 0 is the
  // widely-used "running status" note-off, so treat it as a release.
  if (status === 0x90 && velocity > 0) return { type: 'noteon', pitch, velocity };
  if (status === 0x80 || (status === 0x90 && velocity === 0)) return { type: 'noteoff', pitch };
  // 0xB0 = control change; controller 64 is the sustain (damper) pedal.
  if (status === 0xb0 && pitch === 64) return { type: 'sustain', down: velocity >= 64 };
  // Controller 1 is the mod wheel — recorded into MidiClip.cc since 1.1.0.
  if (status === 0xb0 && pitch === 1) return { type: 'cc', controller: 1, value: velocity };
  return { type: 'other' };
}

// Some controllers (e.g. Kawai/NI S88) expose several MIDI ports that all
// echo the same events; with deviceId '' (all devices) a single key press
// arrives 2-3x. Sustain/CC dupes are coalesced by value at capture time,
// but duplicate note-ons stack live voices and record ~50ms ghost notes.
// A port echo is near-simultaneous (<10ms) with NO intervening note-off;
// a genuine piano re-strike is >20ms apart and preceded by a note-off —
// so only collapse same-type, same-pitch events inside a tiny window.
const NOTE_ECHO_WINDOW_MS = 10;
const NOTE_ECHO_VELOCITY_TOLERANCE = 12; // echoes carry (near-)identical velocity

/**
 * Stateful filter for multi-port note echoes. Returns true when the event
 * is a duplicate of one just seen for the same pitch and should be dropped.
 * Keyed per pitch on the last event's type + timestamp; a note-off replaces
 * the note-on entry (and vice versa), so on→off→on re-strikes always pass.
 * Only noteon/noteoff are considered — everything else returns false.
 */
export function createNoteEchoFilter(now: () => number = () => performance.now()) {
  const last = new Map<number, { type: 'noteon' | 'noteoff'; atMs: number; velocity: number }>();
  return (ev: MidiEvent, timeStampMs?: number): boolean => {
    if (ev.type !== 'noteon' && ev.type !== 'noteoff') return false;
    const atMs = timeStampMs ?? now();
    const prev = last.get(ev.pitch);
    const isEcho =
      !!prev &&
      prev.type === ev.type &&
      atMs - prev.atMs >= 0 &&
      atMs - prev.atMs < NOTE_ECHO_WINDOW_MS &&
      (ev.type === 'noteoff' || Math.abs(ev.velocity - prev.velocity) <= NOTE_ECHO_VELOCITY_TOLERANCE);
    // Keep the FIRST event's timestamp on an echo so a chain of echoes
    // can't slide the window forward and swallow a real re-strike.
    if (!isEcho) last.set(ev.pitch, { type: ev.type, atMs, velocity: ev.type === 'noteon' ? ev.velocity : 0 });
    return isEcho;
  };
}

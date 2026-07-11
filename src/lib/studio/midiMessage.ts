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

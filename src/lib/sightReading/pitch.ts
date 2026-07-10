// A4 = MIDI 69 = 440 Hz. Fractional MIDI keeps cents information alive; callers
// that want a note name round at the last moment.
const A4_HZ = 440;
const A4_MIDI = 69;

export function hzToMidi(hz: number): number {
  if (!(hz > 0)) return NaN;            // log2(0) is -Infinity; NaN is honest
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ);
}

export function midiToHz(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

export function centsOff(hz: number, targetMidi: number): number {
  return (hzToMidi(hz) - targetMidi) * 100;
}

export function nearestMidi(hz: number): number {
  return Math.round(hzToMidi(hz));
}

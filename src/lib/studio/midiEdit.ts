// Pure MIDI note/CC editing operations for the Studio piano roll.
// No DOM, no Tone — everything here is unit-tested in midiEdit.test.ts.
// All times are seconds; grid math converts via 60 / tempo_bpm.

import type { MidiNote, MidiCcEvent } from './session';

export const MIN_NOTE_SECONDS = 0.05;

/** Playback-side sustain: a note released while CC64 is down keeps
 * sounding until the next pedal-up — clamped at a re-strike of the same
 * pitch, and at the end of the material when the pedal never lifts.
 * Clips without CC64 events pass through unchanged (legacy behavior,
 * where the pedal was baked into recorded durations). */
export function applySustain(notes: MidiNote[], cc: MidiCcEvent[]): MidiNote[] {
  const pedal = cc.filter((e) => e.controller === 64)
    .slice().sort((a, b) => a.time_seconds - b.time_seconds);
  if (pedal.length === 0) return notes;
  const materialEnd = Math.max(
    ...pedal.map((e) => e.time_seconds),
    ...notes.map((n) => n.start_seconds + n.duration_seconds),
  );
  return notes.map((n) => {
    const off = n.start_seconds + n.duration_seconds;
    let downAtOff = false;
    for (const e of pedal) {
      if (e.time_seconds <= off) downAtOff = e.value >= 64; else break;
    }
    if (!downAtOff) return n;
    const up = pedal.find((e) => e.time_seconds > off && e.value < 64);
    let end = up ? up.time_seconds : materialEnd;
    const restrike = notes
      .filter((m) => m !== n && m.pitch === n.pitch && m.start_seconds >= off && m.start_seconds < end)
      .sort((a, b) => a.start_seconds - b.start_seconds)[0];
    if (restrike) end = restrike.start_seconds;
    return end > off ? { ...n, duration_seconds: end - n.start_seconds } : n;
  });
}

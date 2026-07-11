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
    .sort((a, b) => a.time_seconds - b.time_seconds);
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

// ── Grid ─────────────────────────────────────────────────────────────

export type RollGrid = '1/4' | '1/8' | '1/16' | '1/32' | '1/8T' | '1/16T';
export const ROLL_GRIDS: RollGrid[] = ['1/4', '1/8', '1/16', '1/32', '1/8T', '1/16T'];

/** Length of one grid unit in seconds. Triplets are 2/3 of the straight value. */
export function gridSeconds(grid: RollGrid, tempoBpm: number): number {
  const q = 60 / tempoBpm;
  const straight: Record<string, number> = { '1/4': q, '1/8': q / 2, '1/16': q / 4, '1/32': q / 8 };
  if (grid.endsWith('T')) return straight[grid.slice(0, -1)] * (2 / 3);
  return straight[grid];
}

const clampPitch = (p: number) => Math.max(0, Math.min(127, p));
const clampVel = (v: number) => Math.max(1, Math.min(127, Math.round(v)));
const snapAbs = (absSeconds: number, grid: number) =>
  grid > 0 ? Math.round(absSeconds / grid) * grid : absSeconds;

// ── Selected-note operations ─────────────────────────────────────────
// `selection` holds indices into `notes`. Ops that preserve count and
// order keep the same indices valid, so chained edits (quantize →
// transpose → nudge) never remap.

export function quantizeNotes(
  notes: MidiNote[], selection: number[],
  opts: { gridSeconds: number; strength: number; clipStartSeconds: number },
): MidiNote[] {
  if (opts.gridSeconds <= 0) return notes;
  const k = Math.max(0, Math.min(1, opts.strength));
  const sel = new Set(selection);
  return notes.map((n, i) => {
    if (!sel.has(i)) return n;
    // Anchor to the TIMELINE grid: clips recorded mid-bar still quantize
    // to real beats, so convert to absolute time before snapping.
    const abs = opts.clipStartSeconds + n.start_seconds;
    const target = snapAbs(abs, opts.gridSeconds);
    const moved = abs + (target - abs) * k;
    return { ...n, start_seconds: Math.max(0, moved - opts.clipStartSeconds) };
  });
}

export function transposeNotes(notes: MidiNote[], selection: number[], semitones: number): MidiNote[] {
  const sel = new Set(selection);
  return notes.map((n, i) => sel.has(i) ? { ...n, pitch: clampPitch(n.pitch + semitones) } : n);
}

export function moveNotes(
  notes: MidiNote[], selection: number[],
  opts: { deltaSeconds: number; deltaSemitones: number; gridSeconds: number; clipStartSeconds: number },
): MidiNote[] {
  const sel = new Set(selection);
  return notes.map((n, i) => {
    if (!sel.has(i)) return n;
    const abs = snapAbs(opts.clipStartSeconds + n.start_seconds + opts.deltaSeconds, opts.gridSeconds);
    return {
      ...n,
      start_seconds: Math.max(0, abs - opts.clipStartSeconds),
      pitch: clampPitch(n.pitch + opts.deltaSemitones),
    };
  });
}

export function resizeNotes(
  notes: MidiNote[], selection: number[],
  opts: { edge: 'left' | 'right'; deltaSeconds: number; gridSeconds: number; clipStartSeconds: number },
): MidiNote[] {
  const sel = new Set(selection);
  return notes.map((n, i) => {
    if (!sel.has(i)) return n;
    if (opts.edge === 'right') {
      const absEnd = snapAbs(opts.clipStartSeconds + n.start_seconds + n.duration_seconds + opts.deltaSeconds, opts.gridSeconds);
      return { ...n, duration_seconds: Math.max(MIN_NOTE_SECONDS, absEnd - opts.clipStartSeconds - n.start_seconds) };
    }
    const end = n.start_seconds + n.duration_seconds;
    const absStart = snapAbs(opts.clipStartSeconds + n.start_seconds + opts.deltaSeconds, opts.gridSeconds);
    const start = Math.max(0, Math.min(end - MIN_NOTE_SECONDS, absStart - opts.clipStartSeconds));
    return { ...n, start_seconds: start, duration_seconds: Math.max(MIN_NOTE_SECONDS, end - start) };
  });
}

export function offsetVelocity(notes: MidiNote[], selection: number[], delta: number): MidiNote[] {
  const sel = new Set(selection);
  return notes.map((n, i) => sel.has(i) ? { ...n, velocity: clampVel(n.velocity + delta) } : n);
}

export function addNote(notes: MidiNote[], note: MidiNote): { notes: MidiNote[]; index: number } {
  const next = [...notes, {
    ...note,
    pitch: clampPitch(note.pitch),
    velocity: clampVel(note.velocity),
    start_seconds: Math.max(0, note.start_seconds),
    duration_seconds: Math.max(MIN_NOTE_SECONDS, note.duration_seconds),
  }];
  return { notes: next, index: next.length - 1 };
}

export function deleteNotes(notes: MidiNote[], selection: number[]): MidiNote[] {
  const sel = new Set(selection);
  return notes.filter((_, i) => !sel.has(i));
}

// ── CC lane helpers ──────────────────────────────────────────────────

/** Pair CC64 events into pedal ranges for rendering/editing. An
 * unmatched trailing pedal-down closes at `fallbackEnd`. */
export function sustainRanges(cc: MidiCcEvent[], fallbackEnd: number): Array<{ down: number; up: number }> {
  const pedal = cc.filter((e) => e.controller === 64)
    .sort((a, b) => a.time_seconds - b.time_seconds);
  const ranges: Array<{ down: number; up: number }> = [];
  let openDown: number | null = null;
  for (const e of pedal) {
    if (e.value >= 64) { if (openDown === null) openDown = e.time_seconds; }
    else if (openDown !== null) { ranges.push({ down: openDown, up: e.time_seconds }); openDown = null; }
  }
  if (openDown !== null) ranges.push({ down: openDown, up: fallbackEnd });
  return ranges;
}

/** Rebuild the CC64 stream from edited ranges; other controllers pass
 * through untouched. Result is time-sorted.
 * Overlapping or touching ranges are merged: if next.down <= current.up,
 * the merged range extends to max(current.up, next.up). */
export function setSustainRanges(cc: MidiCcEvent[], ranges: Array<{ down: number; up: number }>): MidiCcEvent[] {
  const others = cc.filter((e) => e.controller !== 64);

  // Normalize each range (down = min, up = max), sort by down, and merge overlapping/touching ranges
  const normalized = ranges.map((r) => ({ down: Math.min(r.down, r.up), up: Math.max(r.down, r.up) }))
    .sort((a, b) => a.down - b.down);

  const merged: Array<{ down: number; up: number }> = [];
  for (const r of normalized) {
    if (merged.length > 0 && r.down <= merged[merged.length - 1].up) {
      // Overlapping or touching: extend the current range
      merged[merged.length - 1].up = Math.max(merged[merged.length - 1].up, r.up);
    } else {
      merged.push(r);
    }
  }

  const rebuilt = merged.flatMap((r) => [
    { controller: 64, value: 127, time_seconds: r.down },
    { controller: 64, value: 0, time_seconds: r.up },
  ]);
  return [...others, ...rebuilt].sort((a, b) => a.time_seconds - b.time_seconds);
}

/** The editable points of one controller's lane, with their indices in
 * the full cc array (so edits can write back). */
export function ccPoints(cc: MidiCcEvent[], controller: number): Array<{ index: number; time: number; value: number }> {
  return cc.map((e, index) => ({ e, index }))
    .filter(({ e }) => e.controller === controller)
    .map(({ e, index }) => ({ index, time: e.time_seconds, value: e.value }))
    .sort((a, b) => a.time - b.time);
}

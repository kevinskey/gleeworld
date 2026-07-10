import type { ExerciseIR } from './ir';

export interface SungNote { midi: number; beatPos: number; }
export interface ScoreResult {
  firstNoteOk: boolean; pitch: number; rhythm: number; retention: number; overall: number;
  perNote: { expectedMidi: number; sungMidi: number | null; centsOff: number | null; ok: boolean }[];
  driftBar: number | null;
}

const W = { firstNote: 15, pitch: 45, rhythm: 25, retention: 15 };
const RHYTHM_TOLERANCE_BEATS = 0.25;
// A sung note more than a full beat away from an expected note's position is
// treated as "no attempt at this note" rather than a mis-aligned match.
const ALIGNMENT_TOLERANCE_BEATS = 1;

// True when two raw semitone offsets are the same modulo an octave — i.e. the
// singer's displacement from the expected note is octave-equivalent, whether
// that displacement is 0 (dead on), -12 (an octave down), or some other
// octave multiple of a shared pitch-class offset.
const sameOctaveClass = (a: number, b: number) => (((a - b) % 12) + 12) % 12 === 0;

export function scoreAttempt(ir: ExerciseIR, sung: SungNote[]): ScoreResult {
  const expected = ir.notes;

  if (sung.length === 0) {
    return {
      firstNoteOk: false, pitch: 0, rhythm: 0, retention: 0, overall: 0, driftBar: null,
      perNote: expected.map(n => ({ expectedMidi: n.midi, sungMidi: null, centsOff: null, ok: false })),
    };
  }

  // Align by nearest beat position rather than by index: a student who drops
  // a note should not have every subsequent note marked wrong just because
  // the arrays are now offset by one.
  const aligned = expected.map((exp) => {
    let best: SungNote | null = null, bestDist = Infinity;
    for (const s of sung) {
      const d = Math.abs(s.beatPos - exp.beatPos);
      if (d < bestDist) { bestDist = d; best = s; }
    }
    if (!best || bestDist > ALIGNMENT_TOLERANCE_BEATS) {
      return { expectedMidi: exp.midi, sungMidi: null as number | null, offset: null as number | null };
    }
    return { expectedMidi: exp.midi, sungMidi: best.midi, offset: best.midi - exp.midi };
  });

  // The performance's own reference point: whatever offset the student
  // established on the first note they actually sang. Everything else is
  // judged for consistency against THIS, not against 0. That is what lets a
  // whole-line semitone offset keep most of its pitch credit (the intervals
  // between notes are all still correct) while the isolated firstNoteOk
  // dimension is what actually fails the student for mis-placing that first
  // note in the first place.
  //
  // NOTE ON THE BRIEF'S REFERENCE IMPLEMENTATION: the brief's draft scored
  // `pitch` from a per-note ABSOLUTE pitch-class match against the expected
  // note (`pc(sungMidi) === pc(expectedMidi)`). Under a whole-line semitone
  // offset every single note fails that comparison, so `pitch` collapses to
  // 0 — but the brief's own test 3 requires `pitch > 70` for exactly that
  // case ("intervals were all correct"), and the brief's prose says the
  // 15% firstNoteOk dimension exists precisely so it "doesn't destroy the
  // remaining pitch credit." A `pitch` of 0 destroys 100% of it. That draft
  // does not implement its own stated design, so `pitch`/`perNote.ok` here
  // are computed relative to the established baseline offset instead.
  const firstKnownOffset = aligned.find(a => a.offset !== null)?.offset ?? 0;

  const perNote = aligned.map((a) => {
    if (a.sungMidi === null || a.offset === null) {
      return { expectedMidi: a.expectedMidi, sungMidi: null, centsOff: null, ok: false };
    }
    const ok = sameOctaveClass(a.offset, firstKnownOffset);
    return { expectedMidi: a.expectedMidi, sungMidi: a.sungMidi, centsOff: a.offset * 100, ok };
  });

  // firstNoteOk is judged against 0, not against the baseline — this is the
  // one dimension where "consistent with how you started" isn't good enough,
  // because how you started IS the thing being judged. Octave is still
  // forgiven (pc comparison), but any non-octave offset is not.
  const firstAligned = aligned[0];
  const firstNoteOk = firstAligned?.sungMidi !== null && firstAligned?.offset !== null
    && sameOctaveClass(firstAligned.offset, 0);

  const pitch = Math.round((perNote.filter(p => p.ok).length / expected.length) * 100);

  const onTime = expected.filter((exp) =>
    sung.some(s => Math.abs(s.beatPos - exp.beatPos) <= RHYTHM_TOLERANCE_BEATS)).length;
  const rhythm = Math.round((onTime / expected.length) * 100);

  // Retention: does the offset between sung and expected STAY PUT relative to
  // the established baseline? A student who is consistently a semitone flat
  // (or a consistent octave down) has kept the key relative to themselves —
  // that's the baseline, not a drift. A student who starts on pitch and
  // slides to a semitone flat partway through has lost the tonal centre, and
  // we name the bar where that first happens.
  let driftIdx: number | null = null;
  for (let i = 0; i < aligned.length; i++) {
    const offset = aligned[i].offset;
    if (offset !== null && !sameOctaveClass(offset, firstKnownOffset)) { driftIdx = i; break; }
  }
  const retention = driftIdx === null ? 100 : Math.round((driftIdx / expected.length) * 100);

  const beatsPerBar = ir.meter.beats;
  const driftBar = driftIdx === null ? null : Math.floor(expected[driftIdx].beatPos / beatsPerBar) + 1;

  const overall = Math.round(
    (firstNoteOk ? W.firstNote : 0) +
    (pitch / 100) * W.pitch +
    (rhythm / 100) * W.rhythm +
    (retention / 100) * W.retention,
  );

  return { firstNoteOk, pitch, rhythm, retention, overall, perNote, driftBar };
}

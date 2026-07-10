import type { ExerciseIR } from './ir';

export interface SungNote { midi: number; beatPos: number; }
export interface ScoreResult {
  firstNoteOk: boolean; pitch: number; rhythm: number; retention: number; overall: number;
  perNote: {
    expectedMidi: number; sungMidi: number | null;
    // Semitone-quantized, NOT true cents: SungNote.midi is an integer, so this
    // is always a multiple of 100 (e.g. an octave slip reports exactly -1200
    // even though `ok` may still be true). A UI that wants real sub-semitone
    // cents must read the live pitch tracker directly rather than this field.
    centsOff: number | null;
    ok: boolean;
  }[];
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

// The "lower median" of a set of semitone offsets: sorted-and-indexed rather
// than averaged, so the result is always one of the actual observed offsets
// (an integer) instead of e.g. 3.5 between two middle values — averaging
// would make sameOctaveClass's exact modulo comparison never match anything.
// A single outlier offset (including at index 0) cannot move this value,
// which is the whole point: the baseline is "what most of the performance
// agreed on," not "wherever the take happened to start."
function medianOffset(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

export function scoreAttempt(ir: ExerciseIR, sung: SungNote[]): ScoreResult {
  const expected = ir.notes;

  // Empty-sung and empty-expected both collapse to the same zeroed shape.
  // Critically this also guards the case a blank/empty MusicXML upload
  // produces (ir.notes === [] but the student did sing something): without
  // this check, aligned[0] is undefined below and reading .offset off it
  // throws, and expected.length === 0 makes every percentage a divide-by-zero.
  if (sung.length === 0 || expected.length === 0) {
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

  // The performance's own reference point: the median of the STUDENT'S
  // OPENING — the first three aligned offsets (or all of them, if fewer
  // than three notes aligned at all) — not the median of the whole line.
  // Everything else is judged for consistency against THIS, not against 0.
  // That is what lets a whole-line semitone offset keep most of its pitch
  // credit (the intervals between notes are all still correct) while the
  // isolated firstNoteOk dimension is what actually fails the student for
  // mis-placing that first note in the first place.
  //
  // Anchoring to a median of the OPENING (rather than a median of every
  // aligned note) is what keeps a single bad opening note — including a
  // wrong or dropped note 0 — from becoming a single point of failure for
  // every other note's pitch credit, while ALSO stopping a later, sustained
  // drift from hijacking the baseline just because the drifted notes end up
  // outnumbering the correctly-sung opening: a student who sings the first
  // half on pitch and then drifts flat for the rest is judged against how
  // they started, not against whichever half happened to have more notes.
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
  const alignedOffsets = aligned
    .map((a, i) => ({ i, offset: a.offset }))
    .filter((x): x is { i: number; offset: number } => x.offset !== null);
  const baselineOffset = medianOffset(alignedOffsets.slice(0, 3).map(x => x.offset));

  const perNote = aligned.map((a) => {
    if (a.sungMidi === null || a.offset === null) {
      return { expectedMidi: a.expectedMidi, sungMidi: null, centsOff: null, ok: false };
    }
    const ok = sameOctaveClass(a.offset, baselineOffset);
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
  // that's the baseline, not a drift. A single off-baseline note that
  // immediately recovers is a transient slip, not lost tonal centre — so we
  // only call it drift once the offset differs from the baseline for two or
  // more CONSECUTIVE aligned notes (a dropped/unaligned note in between
  // doesn't reset the run; it just wasn't evidence either way). driftIdx is
  // the first note of that run, and we name the bar it falls in.
  let driftIdx: number | null = null;
  {
    let runStartIdx: number | null = null;
    let runLen = 0;
    for (const { i, offset } of alignedOffsets) {
      if (!sameOctaveClass(offset, baselineOffset)) {
        if (runLen === 0) runStartIdx = i;
        runLen++;
        if (runLen >= 2) { driftIdx = runStartIdx; break; }
      } else {
        runLen = 0;
        runStartIdx = null;
      }
    }
  }

  // A take that aligns with NOTHING (every offset null) must not out-score
  // silence just because there's no baseline to have drifted from — force it
  // to 0 rather than falling through to the "no drift found" 100 case.
  const retention = alignedOffsets.length === 0
    ? 0
    : driftIdx === null ? 100 : Math.round((driftIdx / expected.length) * 100);

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

import type { ExerciseIR } from './ir';

// `cents` is the sung note's real deviation from `midi` (nearest semitone),
// carried through from the pitch tracker so grading can judge intonation
// rather than only which semitone bin the note landed in. Optional: callers
// that don't have it (older takes, tests) leave it undefined and are treated
// as dead-centre (0 cents).
export interface SungNote { midi: number; beatPos: number; cents?: number; }
export interface ScoreResult {
  firstNoteOk: boolean; pitch: number; rhythm: number; retention: number; overall: number;
  perNote: {
    expectedMidi: number; sungMidi: number | null;
    // Real cents of deviation from the expected note, folded into the nearest
    // octave (so an octave slip reads ~0, not ∓1200). Fractional intonation is
    // preserved when the take carried per-note cents.
    centsOff: number | null;
    /** How far off the beat this note landed, in beats. Null if never attempted. */
    beatsOff: number | null;
    ok: boolean;
  }[];
  driftBar: number | null;
}

const W = { firstNote: 15, pitch: 45, rhythm: 25, retention: 15 };
const RHYTHM_TOLERANCE_BEATS = 0.25;
// A sung note more than a full beat away from an expected note's position is
// treated as "no attempt at this note" rather than a mis-aligned match.
const ALIGNMENT_TOLERANCE_BEATS = 1;

// Per-note pitch credit is a ramp, not pass/fail: a note within FULL_CREDIT_CENTS
// of the baseline earns full marks, sliding linearly to zero by ZERO_CREDIT_CENTS
// (a full semitone off). OK_CENTS is the quarter-tone boundary used for the ✓/✗
// per-note display and for drift detection.
const FULL_CREDIT_CENTS = 35;
const ZERO_CREDIT_CENTS = 100;
// Quarter-tone line, still used for drift detection (a sustained lean flat or
// sharp) — but no longer for whether a note passes; see PASS_CREDIT.
const OK_CENTS = 50;

// Sight singing trains READING, not perfect pitch. A note passes when it is at
// least 80% correct on pitch AND on rhythm, judged independently — intonation
// and timing still shape the score, they just don't gate the pass at
// trained-singer precision. With the ramps below that works out to roughly a
// quarter tone (~48 cents) and about a fifth of a beat.
// EPS keeps the boundary inclusive: a note exactly at the 80% line computes a
// hair under it in floating point, and "80% counts as passing" shouldn't hinge
// on that.
const PASS_CREDIT = 0.8;
const PASS_EPS = 1e-9;
const RHYTHM_FULL_CREDIT_BEATS = 0.125;
const RHYTHM_ZERO_CREDIT_BEATS = 0.5;

// Signed cents between a sung offset and a reference, folded into the nearest
// octave so octave displacement reads as ~0 (a singer an octave down still has
// the right pitch class). Both inputs are in semitones and may be fractional
// now that real cents ride along on each captured note.
function octaveFoldedCents(offset: number, ref: number): number {
  const rel = offset - ref;
  return (rel - 12 * Math.round(rel / 12)) * 100;
}

// Ramp from full credit (≤ FULL_CREDIT_CENTS) down to none (≥ ZERO_CREDIT_CENTS).
function noteCredit(absCents: number): number {
  if (absCents <= FULL_CREDIT_CENTS) return 1;
  if (absCents >= ZERO_CREDIT_CENTS) return 0;
  return 1 - (absCents - FULL_CREDIT_CENTS) / (ZERO_CREDIT_CENTS - FULL_CREDIT_CENTS);
}

/** The same shape of ramp for timing: how correct this note's placement was. */
function rhythmCredit(absBeats: number): number {
  if (absBeats <= RHYTHM_FULL_CREDIT_BEATS) return 1;
  if (absBeats >= RHYTHM_ZERO_CREDIT_BEATS) return 0;
  return 1 - (absBeats - RHYTHM_FULL_CREDIT_BEATS) / (RHYTHM_ZERO_CREDIT_BEATS - RHYTHM_FULL_CREDIT_BEATS);
}

// The "lower median" of a set of semitone offsets: sorted-and-indexed rather
// than averaged, so the result is always one of the actual observed offsets
// instead of a value between two of them.
// A single outlier offset (including at index 0) cannot move this value,
// which is the whole point: the baseline is "what most of the performance
// agreed on," not "wherever the take happened to start." Returning an OBSERVED
// offset (not an average) also keeps the baseline from landing between two real
// offsets and skewing every note's cents distance from it.
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
      perNote: expected.map(n => ({ expectedMidi: n.midi, sungMidi: null, centsOff: null, beatsOff: null, ok: false })),
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
      return {
        expectedMidi: exp.midi, sungMidi: null as number | null,
        offset: null as number | null, beatsOff: null as number | null,
      };
    }
    // Offset is the CONTINUOUS distance (semitones, fractional) from the
    // expected note, folding the tracker's real cents back onto the integer
    // midi. sungMidi stays the integer for display.
    const sungPitch = best.midi + (best.cents ?? 0) / 100;
    return {
      expectedMidi: exp.midi, sungMidi: best.midi,
      offset: sungPitch - exp.midi, beatsOff: best.beatPos - exp.beatPos,
    };
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
      return { expectedMidi: a.expectedMidi, sungMidi: null, centsOff: null, beatsOff: null, ok: false };
    }
    // A note passes only if it is at least 80% correct on BOTH dimensions —
    // pitch can't carry sloppy timing and vice versa.
    const ok = noteCredit(Math.abs(octaveFoldedCents(a.offset, baselineOffset))) >= PASS_CREDIT - PASS_EPS
      && rhythmCredit(Math.abs(a.beatsOff ?? 0)) >= PASS_CREDIT - PASS_EPS;
    return {
      expectedMidi: a.expectedMidi,
      sungMidi: a.sungMidi,
      centsOff: Math.round(octaveFoldedCents(a.offset, 0)),
      beatsOff: a.beatsOff,
      ok,
    };
  });

  // firstNoteOk is judged against 0, not against the baseline — this is the
  // one dimension where "consistent with how you started" isn't good enough,
  // because how you started IS the thing being judged. Octave is still
  // forgiven (pc comparison), but any non-octave offset is not.
  const firstAligned = aligned[0];
  const firstNoteOk = firstAligned?.sungMidi != null && firstAligned?.offset != null
    && Math.abs(octaveFoldedCents(firstAligned.offset, 0)) <= OK_CENTS;

  // Pitch is the AVERAGE ramped credit over the notes actually captured — a note
  // the mic never heard is left OUT of the denominator, not counted as a miss, so
  // a soft note or a timing slip can't crater the pitch score. Each captured note
  // earns credit for how close it sits to the baseline, folded by octave.
  const credits = alignedOffsets.map(({ offset }) => noteCredit(Math.abs(octaveFoldedCents(offset, baselineOffset))));
  const pitch = credits.length === 0
    ? 0
    : Math.round((credits.reduce((s, c) => s + c, 0) / credits.length) * 100);

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
      if (Math.abs(octaveFoldedCents(offset, baselineOffset)) > OK_CENTS) {
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

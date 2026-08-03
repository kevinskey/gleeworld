# Clap Blast — Design Spec

**Date:** 2026-08-03
**Status:** Approved by Kevin (brainstorming session)
**Parent specs:** `2026-07-27-reading-music-suite-design.md`, `2026-08-02-rhythm-machine-design.md` — locked decisions there apply here.

## What it is

A rhythm arcade drill inside the Reading Music suite's Rhythm tab. The player hits Start, a metronome gives a one-measure count-in, notes scroll right-to-left across a single-line staff, and the player claps at the exact moment each note crosses a fixed hit line. A well-timed clap explodes the note; timing is graded Perfect / Good / Miss; score and streak accumulate.

## Scope decisions (agreed)

- **Placement:** fourth drill (`'clap_blast'`) in the existing `DRILLS` array in `RhythmTab.tsx` — inherits level pills, star gating, assessment gating, and confetti. Not a new domain, not a full-screen takeover.
- **Content:** Phase 1 uses `generatePattern` (level-appropriate generated rhythms). Phase 2 (separate effort): hand-authored, teacher-assignable exercises.
- **Devices:** desktop, iPad Safari, and the iOS app at launch — hence the calibration step below.
- **Progress:** every completed round persists per student; rhythm mastery ring updates automatically.

## Architecture

New code:

- `src/lib/rhythm/clapBlast.ts` — pure engine: hit-window matching, live-grading state machine, calibration median math. No DOM, no audio; unit-tested like the sibling `pattern`/`grade` modules.
- `src/pages/readingMusic/ClapBlastStage.tsx` — the play surface: scrolling staff (animated variant of `RhythmStrip`'s linear pulse→px mapping), explosions, streak/score HUD, results.

Reused unchanged:

- `generatePattern` for level-appropriate rhythms.
- Onset pipeline: `startMicOnsetSession` (mic) and `tap.ts` (pointer/spacebar). Both emit onset timestamps in seconds relative to exercise-zero on the AudioContext clock; the game never knows which input fired.
- `clickSchedule` count-in: loud count-in clicks, deliberately quiet under-take clicks so the speaker never triggers the clap detector.
- `insertAttempt({ domain: 'rhythm', drill: 'clap_blast', ... })` — zero migration; `drill` is free text and `payload` is jsonb.
- `RhythmResults` layout for end-of-round results, `starsFor` thresholds, `RhythmConfetti`.

## Game loop & timing

- Phases: `idle → countin → play → result` (matches existing rhythm drills).
- Start button gesture creates/resumes the AudioContext and opens the mic (iOS requirement).
- Count-in: 1 measure, loud.
- Round length: one generated pattern of 4 measures.
- Notes scroll right-to-left; fixed hit line ~20% from the left edge. Note positions are computed every animation frame from `ctx.currentTime` — never wall-clock timers — so visuals cannot drift from the metronome. A dropped frame delays rendering only, never timing.
- A clap while a note is inside its hit window explodes it. A note that exits its window un-clapped grays out and slides away as a miss. Stray claps (no note in window) flash the hit line red with **no score penalty** (forgiving for young players; may tighten later).
- Live grading consumes the onset stream in real time (the mic session's 12 ms polling already provides this); grading is per-note as windows close, not end-of-take.

## Clap detection & latency calibration

- `getUserMedia` with `{ echoCancellation: false, noiseSuppression: false, autoGainControl: false }` (house convention for analytical capture), feeding the existing flux onset detector (adaptive noise floor, hysteresis, 80 ms refractory).
- Mic denied/failed → automatic fallback to tap/spacebar with a small notice (locked decision from Rhythm Machine spec).
- **Calibration (new):** first launch per device runs "Clap along with 8 clicks." Median of (clap time − click time) is stored as `rm_clap_latency_ms` in localStorage and shifts every hit window during play. A "recalibrate" button is always available. Rationale: Bluetooth/iPad output+input latency (100–300 ms) would otherwise make Perfect unattainable; follows the `takeAlignment.ts` philosophy — measure the variable part, configure the hardware part.

## Scoring & feedback

- Tolerances are **percentages of the beat, never absolute ms** (suite-wide locked rule). Perfect ≈ ±15% of a beat, Good ≈ ±30%, else Miss — reusing the exact constants from `grade.ts`.
- Perfect → large explosion + flash; Good → smaller pop; Miss → gray-out.
- Streak counter with 🔥 styling at 3+ and milestone toasts at 10/25/50 (Pitch Match convention).
- Results screen: score chip, on-time/early/late/missed counts, timing lane (expected ticks vs actual claps), stars at 80/88/95 → ★/★★/★★★, confetti on first 3★.

## Persistence

- On round completion: `insertAttempt` with payload containing pattern, per-note verdicts, raw clap offsets, level, BPM, and input mode (mic|tap) — everything needed to redraw results identically in the teacher Class view (existing convention).
- Best-star-per-level merges into the existing local star map (`rm_rhythm_stars` pattern) so level unlocks and assessment gating just work.
- Any student-facing history query scopes explicitly by `session.user.id` (house pattern; do not rely on RLS alone — see the `listAssessmentAttempts` caveat).

## Error handling & platform gotchas

- AudioContext created/resumed inside the Start gesture; iOS-specific failure message if `resume()` fails (copy `useMicPitch` handling).
- `visibilitychange` mid-round cancels the take with a toast; no partial attempt saved. Teardown clears all timers, disposes the onset session, stops all mic tracks (copy `cancelTake` discipline from `RhythmTab`).
- Under-take metronome gain stays at 0.05–0.1.
- Echo/demo audio (if any) must fully end before mic capture opens.

## Testing

- Unit tests for `clapBlast.ts`: hit-window matching (including calibration offset applied), live-grading state machine transitions, stray-clap handling, calibration median math.
- Playwright pass via the tap-input path (fake-mic harness exists for related flows).
- Real-device verification required before ship: Mac, iPad Safari, iOS app (WKWebView mic) — clap detection and latency are only truly verifiable with actual hands and speakers.

## Phasing

1. **Phase 1 (this build):** everything above.
2. **Phase 2 (separate spec):** teacher-authored exercises assignable to students.

## Out of scope

- Camera/body-percussion detection (never — parent spec).
- Score penalties for stray claps (revisit after classroom feedback).
- Teacher dashboard changes beyond what the existing Class view already renders from attempt payloads.

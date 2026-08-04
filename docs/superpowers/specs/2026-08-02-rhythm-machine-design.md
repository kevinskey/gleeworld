# Rhythm Machine — Reading Music Phase 2 Design

**Date:** 2026-08-02
**Status:** Approved (design review with Kevin, 2026-08-02)
**Scope:** Full Phase 2 bundle per the Reading Music suite spec (2026-07-27): Rhythm
Machine drills + Assessment mode + `gw_reading_music_attempts` table + teacher override.
**Parent spec:** `2026-07-27-reading-music-suite-design.md` (progression, syllable
systems, timing-tolerance philosophy, and classroom constraints are locked there).

## Decisions made in this review

| Question | Decision |
|---|---|
| Scope | Full Phase 2 bundle (drills + assessment + table + override), not drills-only. |
| Input method | Tap (pointer/spacebar) **and** mic clap detection both ship in v1. Tap is the default; mic is a toggle. MIDI pad deferred. |
| Attempt storage | Onset data only (JSON payload). No audio files, no bucket work. Results screens redraw entirely from stored data. |
| Architecture | Standalone pure rhythm engine + new consolidated attempts table (Approach A). Existing pitch-match / sight-singing storage untouched; they migrate in a later phase. |
| Notation | New lightweight single-line `RhythmStrip` renderer, not NotationView. |

## 1. Rhythm engine — `src/lib/rhythm/` (pure, unit-tested)

- **`pattern.ts`** — `RhythmPattern` = `{ meter: {beats, beatType}, events: Array<{startBeat, durationBeats, isRest}> }`
  plus the rhythm level catalog: 8 rhythm levels mapped onto the suite's 16-level
  progression (1 steady beat → 2 quarters/eighths → 3 rests → 4 dotted → 5 compound 6/8 →
  6 syncopation → 7 ties across beats → 8 odd meters 5/8–7/8). Compound meter appears at
  rhythm level 5 (suite level ~6), NOT at the end — parent-spec mandate.
- **`generate.ts`** — seeded cell-based generator. Each level declares its legal one-beat
  (or one-dotted-beat, in compound) rhythm cells; measures assemble from those cells.
  Deterministic under a seed so tests can assert exact output.
- **`syllables.ts`** — labels every non-rest event in one of three systems:
  Takadimi (default), Kodály (ta / ti-ti), 1-e-&-a counting. Pure function of
  (events, meter, system); one pattern renders in any system.
- **`grade.ts`** — compares detected onsets to expected onsets:
  - Greedy nearest-match pairing of actual onsets to expected onsets.
  - Per-note verdict: `early | on_time | late | missed`; unmatched extra onsets penalized;
    rests scored by absence of onsets in the rest window.
  - Tolerance expressed as **% of the beat** (parent-spec mandate, never absolute ms):
    ±10% of beat in practice, ±6% in assessment, clamped to a 30ms floor so fast tempos
    stay achievable. Verdict window (early/late vs missed) is 2× tolerance.
  - Output: per-event verdicts + overall score 0–100 + passed flag. Pass threshold is 80
    for all levels/drills in this phase (constant in `grade.ts`; per-level tuning later if
    real usage demands it).
- **`onsets/tap.ts`** — pointerdown + spacebar keydown listener. Timestamps anchored to the
  AudioContext clock (same time base as the metronome schedule).
- **`onsets/mic.ts`** — clap/onset detector: `AnalyserNode` frames → RMS + spectral flux →
  peaks above an adaptive noise floor = onsets; ~80ms refractory period to kill doubles.
  Emits the same shape as the tap listener.
- **Contract:** both input sources emit `onsets: number[]` (seconds, exercise-time-zero
  relative, AudioContext-anchored). Grader, results UI, and persistence never know which
  input produced them.
- **Count-in / click:** reuse `clickSchedule()` + `playClicks()` from
  `src/lib/sightReading/metronome.ts`. Its quiet-under-take click design already solves
  speaker bleed into an echoCancellation-off mic.

## 2. UI — `RhythmTab` in `src/pages/readingMusic/`

Follows `PitchMatchTab`'s game shape: journey HUD, per-level stars, streak fire, chime,
confetti on milestones. `domains.ts` flips `rhythm` to `live` (Continue-tab jump button
and Progress mastery ring light up automatically via the summary view).

**Three drills:**
1. **Steady Beat** (rhythm levels 1–2) — tap/clap along with the click; scored on phase
   accuracy and consistency.
2. **Echo (clap-back)** — app plays the pattern with a percussive click voice, then
   count-in, student echoes. No notation shown; this is the aural entry point.
3. **Read & Clap** — pattern displayed on a `RhythmStrip` with syllables under the notes;
   count-in; student performs. This is the literacy drill.

**`RhythmStrip`** — new lightweight single-line renderer (noteheads, stems, beams, rests,
syllable underlay). Deliberately NOT `NotationView`: no staff/pitch machinery needed, and
syllable underlay is custom either way. Lives in `src/pages/readingMusic/RhythmStrip.tsx`
(pure render from `RhythmPattern` + syllable system).

**Input toggle:** Tap (default — large tap pad + spacebar hint on desktop) ↔ Mic (clap).
Mic path shows a live level meter; permission denial or zero-signal auto-falls back to tap
with a toast. Choice persisted per user (localStorage) and recorded in the attempt payload.

**Syllable toggle:** Takadimi · Kodály · 1-e-&-a. Persisted per user (localStorage);
recorded in attempt payload. Teacher per-class default deferred to Phase 3's class surface.

**Tempo:** BPM stepper (40–180, ±5) matching the SingFlow header pattern; level presets
choose a sane default per drill.

**Results screen:** horizontal timeline — expected grid ticks vs. actual onset markers,
early/late coloring, per-note ✓/✗, score %, and the syllable row for reference. Drawn
entirely from data that goes into the attempt payload (so the teacher view can redraw it).

## 3. Persistence — new `gw_reading_music_attempts`

One migration, mirroring `gw_pitch_match_attempts`' proven pattern exactly:

```sql
CREATE TABLE gw_reading_music_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants(id),
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  domain         text NOT NULL CHECK (domain IN ('pitch_intervals','rhythm','sight_singing','dictation','harmony','scales_theory')),
  drill          text NOT NULL,            -- 'steady_beat' | 'echo' | 'read_clap' | future drills
  mode           text NOT NULL DEFAULT 'practice' CHECK (mode IN ('practice','assessment')),
  level          integer NOT NULL,
  score          numeric NOT NULL,
  passed         boolean NOT NULL DEFAULT false,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- expected events, actual onsets, bpm, input, syllable system, tolerance, flags
  override_score numeric,
  overridden_by  uuid REFERENCES auth.users(id),
  overridden_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

- Indexes on `(user_id, created_at DESC)` and `(tenant_id, created_at DESC)`.
- RLS identical in shape to pitch-match: RESTRICTIVE tenant isolation
  (`tenant_id = current_tenant_id()`), self-ALL (`user_id = auth.uid()`), teacher-read
  (is_admin / is_super_admin). `BEFORE INSERT` trigger `set_tenant_id_default()`.
- **Teacher override** via `SECURITY DEFINER` RPC
  `override_reading_music_attempt(attempt_id uuid, new_score numeric)` — verifies caller
  is admin in the attempt's tenant, sets `override_score/overridden_by/overridden_at`.
  RPC instead of a column-limited UPDATE policy: simpler to audit, impossible to widen by
  accident.
- `reading_music_domain_summary` view: add a rhythm branch sourcing from this table with
  effective score = `COALESCE(override_score, score)`; pitch branch unchanged.
- Rhythm writes go here. Pitch-match and sight-singing storage untouched this phase; they
  consolidate into this table in a later phase (the CHECK constraint already admits them).
- All client inserts use `.insert().select()` and check the returned row (demo-tenant
  silent-failure gotcha).

## 4. Assessment mode

- Same drill UI with `mode: 'assessment'`; the flag changes: tighter tolerance (±6% of
  beat), one take per press (no mid-take restart), and the attempt row is inserted
  immediately on completion — permanent and teacher-visible. Practice mode keeps
  best-of-level for stars; assessment keeps every attempt.
- Entry point: a "Take assessment" button per level, unlocked by passing that level in
  practice. Strict one-attempt-per-assignment enforcement arrives with Phase 3's teacher
  assign flow; until then re-takes are allowed but all are recorded — no silent
  best-keeping.
- A take with no detected input records as-is with `payload.no_input = true` rather than
  silently scoring 0, so teachers can spot hardware problems vs. performance problems.

## 5. Teacher surface (minimal, this phase)

The admin-only Class tab (currently a placeholder) gains an **Assessment attempts** list:
tenant-scoped recent `mode='assessment'` rows — student name, drill, level, score
(effective), timing-timeline snippet redrawn from payload, and a one-click override
(prompt for corrected score → RPC). Roster heatmap, assign flow, and weekly digest remain
Phase 3.

## 6. Error handling & platform gotchas

- AudioContext created/resumed inside the user's click gesture (pitch-match lesson,
  commit `1d3603793`).
- Mic permission denied or stream dead → auto-switch to tap + toast; never a dead end.
- Tab hidden mid-take (visibilitychange) → cancel the take cleanly, no partial insert.
- Metronome under-take clicks stay quiet (existing `playClicks` behavior) so the onset
  detector doesn't hear the speaker.
- Onset detector must ignore its own reference-pattern playback: mic capture starts only
  after playback ends in Echo mode.
- `?tab=` whitelist in `ReadingMusicPage.tsx` gains `rhythm` (per the Phase 1 pattern).

## 7. Testing

- **Vitest (pure engine):** generator — every emitted cell legal for its level,
  deterministic under seed, bar math exact in 2/4, 3/4, 4/4, 6/8, 5/8, 7/8; syllables —
  all three systems, including compound-meter Takadimi and Kodály; grader — tolerance
  edges, early/late/missed verdicts, extra-onset penalty, rest windows, %-of-beat scaling
  across tempos, 30ms floor.
- **Onset detector:** fixture tests over synthetic sample buffers (impulse trains at known
  offsets, ± white noise) asserting detected onset times within tolerance.
- **Component smoke tests** per repo pattern (tab renders, mode switch, results screen
  from a canned payload).
- **Manual QA:** Chromebook-class laptop (mic + fan noise), iPad Safari (gesture +
  Bluetooth latency check), phone width (tap pad ergonomics).

## 8. Out of scope (deferred)

- MIDI drum-pad input (parent spec lists it; serious HS/college — later).
- Teacher per-class syllable default (Phase 3 class settings).
- Assign flow + strict one-attempt enforcement + roster heatmap (Phase 3).
- Migrating pitch-match / sight-singing writes into `gw_reading_music_attempts`.
- Rhythm dictation (belongs to the Dictation domain).
- Camera/body-percussion detection (parent spec: never).

## 9. Deploy notes

- Migration applied by Kevin via `!` (harness blocks prod DB writes); frontend via
  `scripts/deploy-frontend.sh`; verify CACHE_VERSION = main tip post-deploy
  (stale-build gotcha).

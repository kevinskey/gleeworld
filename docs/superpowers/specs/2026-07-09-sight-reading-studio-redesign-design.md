# Sight Reading Studio — redesign

**Date:** 2026-07-09
**Status:** approved for planning
**Branch:** `feature/sight-reading-redesign`
**Method:** four-expert panel (pedagogy, mobile IA, codebase, Academy integration), each design
adversarially critiqued, then synthesized. Every claim below was verified against the repo and the
production database.

---

## What this page is

A **low-stakes, self-directed practice tool**. A student opens it on a phone, gets a singable line —
generated on demand, or one a teacher uploaded — hears the key established, sings it, and receives
**feedback, not a grade**, on pitch and rhythm. Then tries again.

A Glee Academy **Sight Reading class** can push exercises in as practice. The resulting grade lives in
the Academy gradebook, on a different surface. The student's experience is identical whether a line is
assigned or self-generated. The Studio never shows a letter, a percentage-as-verdict, or a due-date badge.

## Why it needs rebuilding, not restyling

Verified today against the live system:

**The scoring is a placebo.** `/sight-reading-generator` is live and renders `SightSingingStudio`.
When a student sings, `useGrading` posts the audio to the deployed `assess-sight-singing` edge function,
which sends it to **OpenAI Whisper (speech-to-text)** and then asks GPT to judge *pitch and rhythm
accuracy from the resulting transcript*. On a JSON parse failure it returns `pitch_accuracy: 75,
rhythm_accuracy: 75`. There is no DSP anywhere in the path. A transcript cannot contain pitch.

**There is no exercise bank.** `gw_academy_exercises` has 135 rows, but they are multiple-choice theory
questions (`{"q":"What does 'unison' mean?",...}`) attached to Academy lessons — not sight-reading lines.

**Every scoring table is empty.** `sight_singing_assessments` 0, `sight_singing_recordings` 0,
`gw_sight_reading_exercises` 0, `gw_sight_reading_assignments` 0, `gw_scores` 0, `submissions` 0.
The `--% / --% / 0` stat cards in the screenshot are *honest*. The empty state is the only state that
has ever existed in production.

**The feature was built four times.** 31 components across 7 routes; 3 orphaned. `AssignmentCreator`
queries `fy_cohorts` and `gw_executive_board_members` — empty Spelman-era tables.

**The page fights itself.** Two competing tab rows (Practice/Resources/Pitch Pipe, then Practice
Library/Score History) with three full-width empty stat cards stacked between them. On a 390px phone
the student scrolls past a scoreboard of nothing before reaching any content.

## Fixed decisions (product owner)

1. The Studio stays a low-stakes practice tool. A Sight Reading class assigns *into* it. Grades live in
   the Academy gradebook.
2. Teacher-uploaded scores are **MusicXML only** — fully scoreable. No PDF path in v1.
3. **Promotion:** practice is unlimited and ungraded. The student chooses which take to submit; it
   auto-populates the gradebook; the teacher can override.
4. **Grading rule:** *completion* counts. The 0–100 is shown to the student as feedback and does **not**
   drive the grade. A student may sing a hard line badly, twenty times, and lose nothing.
5. **Priming:** full I–IV–V–I cadence, then the starting pitch, before every attempt.
6. **Theory review is removed from this page entirely.** It is 135 multiple-choice questions belonging to
   Glee Academy. Students reach it from there. Not even a footer link.

---

## Mobile page structure

One route, one screen, one navigation model.

**One segmented control** replaces both tab rows: **Practice · Library · Progress**.

- *Practice* — do it now. Generate controls, the assigned-work card (only when assignments exist),
  recent takes.
- *Library* — pick a saved or teacher-uploaded MusicXML score.
- *Progress* — history, plus Average / Best / Attempts. These numbers exist **nowhere else**, and render
  only **after the first attempt exists**.

**Pitch Pipe** is demoted from a top-level tab to a warm-up chip in the Practice header. It is a tool,
not a destination. **Theory review** is gone (decision 6). The three stat cards are deleted from the
landing view.

### Empty state — what every new student and every new tenant sees (390px)

```
+--------------------------------------+
|  <  Back        Sight Reading        |
+--------------------------------------+
|                                      |
|  Sing a line, get instant feedback.  |
|  No grades -- just practice.         |
|                                      |
|  +--------------------------------+  |
|  |      >  Start practice         |  |   PRIMARY -- one tap, above fold
|  +--------------------------------+  |
|                                      |
|  Key [C v]  Clef [Treble v]          |
|  Level  (1)(2) 3  4  5  6  [Pitch pipe]
+--------------------------------------+
|   Practice  .  Library  .  Progress  |   ONE segmented control
|   =========                          |
+--------------------------------------+
|  Recent takes                        |
|  +--------------------------------+  |
|  |  Nothing yet. Generate a line  |  |
|  |  above and sing it.            |  |
|  +--------------------------------+  |
+--------------------------------------+
```

Progress, in the same zero-data state, shows one line — not three `--%` tiles:
`No takes yet. Sing your first line and your progress shows up here.  [ Start practice ]`

### The sing flow

1. **Tap Start practice.** If mic permission isn't granted, a one-screen primer explains *"To score your
   singing we listen through your mic; audio is analyzed on-device and not recorded"* **before** the OS
   prompt. If denied, the line still renders and plays, with an "Enable mic to get scored" banner.
   Never a dead end.
2. **Priming.** Sound I–IV–V–I in the key, then the starting pitch alone. Scoring begins after priming.
   This is the line between sight-*singing* and pitch-mimicry, and it is not optional.
3. **Count-in + sing.** Four-beat count-in with visual pulse and clicks. Tempo is student-adjustable —
   low stakes means they may slow it down. A cursor advances with the beat; notation renders **one short
   phrase at a time** rather than continuously auto-scrolling (safer in WKWebView). The beat does not
   stop if the student is flat, silent, or lost. Pause and Restart are always visible. **No mid-phrase
   red flashes** — feedback is deferred to the result screen.
4. **End → "Scoring…" → the result slides up.**

### Result screen — feedback, not a grade

```
+--------------------------------------+
|  x  Close          Your take         |
+--------------------------------------+
|              .---------.             |
|              |   82    |  Nice work! |   feedback ring, NOT a grade
|              |  / 100  |             |   no letter, no pass/fail
|              '---------'             |
|   Started on pitch  [ ok ]           |
|   Pitch    ########--  84            |
|   Rhythm   #######---  78            |
|   Kept the key  ######---  drifted   |
|                 at bar 6             |
+--------------------------------------+
|  Your line                           |
|  | q q N q  q O q  N q |             |   per-note tint on the redrawn line
|  green=hit  amber=off  gray=missed   |
|  "bar 3: you sang FA, target was MI" |   functional/solfege feedback
|  [ |<---o------- >| ] hear reference  |
+--------------------------------------+
|  [ ^ Try again ]  [ Hear reference ] |   iterate first
|  [        +  New exercise         ]  |
|  Saved to your class practice        |   only if assigned; no letter shown
+--------------------------------------+
```

---

## Learning model

**One Exercise IR.** Generated lines and teacher MusicXML compile to the same internal representation:
`key, mode, meter, tempo`, `notes:[{midi, durationBeats, beatPos, tie, solfege, phraseIdx}]`, `phrases`,
`difficulty 1–10`, and a `featureVector {rangeSemitones, maxLeap, rhythmVocab, chromaticCount, modulates}`.

Reference audio for priming and playback is **synthesized from the IR** — no audio file is ever stored or
fetched. This is what dissolves the empty-bank problem: a brand-new tenant with zero rows has infinite
content on day one, because lines are *generated under musical constraints*, not drawn from a table.

**A generated exercise is a constrained melody sampler, never random notes.** Every level enforces: the
line begins and ends on a stable tonic-triad member; tendency tones resolve (fa→mi, ti→do, si→la); leaps
outline the tonic or dominant triad and are followed by stepwise motion in the opposite direction; each
phrase is singable in one breath with a clear arch. A weak sampler produces unsingable lines and makes the
whole tool feel like a toy.

**Ladder:** Kodály, movable-do. Ship **Bands A–B** in v1 (pentatonic → diatonic major, simple meters).
Minor and modes are deferred.

**Scoring — four dimensions.** Weights `15 / 45 / 25 / 15`:

| Dimension | Weight | What it measures |
|---|---|---|
| First-note placement | 15% | Did the student find the starting pitch from the primed key? |
| Pitch accuracy | 45% | Per-note, relative to the tonic, with sequence alignment |
| Rhythm accuracy | 25% | Onset timing against the beat grid |
| Key retention | 15% | Did the tonal centre drift, and where? |

Pitch is scored **relative to the tonic** with sequence alignment, so a student who recovers after one
wrong note is not punished for every note thereafter. **Octave displacement is forgiven** (a bass singing
the line an octave down is correct).

A whole-line semitone offset is **not** forgiven. See Disagreements.

---

## Sight Reading class integration

A Sight Reading class is an **ordinary `gw_academy_course`**, with the existing units, lessons, enrollment
and attendance. "Assign 4 exercises due Friday" is **one ordinary `gw_assignments` row**
(`assignment_type='sight_reading'`, `course_id`, `due_at`, `points`, `is_active`, `created_by`). The graded
record is an ordinary `gw_assignment_submissions` row — **that table is the gradebook**, and it keys on
`user_id` (verified; there is no `student_id` column). We do not build a parallel assignment system.

> **Verified against production, correcting the panel.** `gw_assignments.assignment_type` is plain `text`
> with **no check constraint** — `'sight_reading'` is not an existing enum value, it is simply a string we
> start writing. If we want it constrained, that is a deliberate migration, not a given.
>
> `gw_sight_reading_exercises` **already exists with the right shape and already has `tenant_id`**:
> `id, user_id, title, params jsonb, musicxml text, pdf_url, created_at, updated_at, tenant_id`.
> So the ALTER below adds far less than the panel assumed. Two things to decide when planning:
> its `user_id` column implies a *per-user* bank, but a teacher's score bank should be tenant-scoped and
> teacher-owned — treat `user_id` as "who uploaded it", not "who may see it". And `pdf_url` exists but is
> **unused in v1** (MusicXML only, decision 2); leave the column, ignore the path.

Only three things are new or repurposed.

```sql
-- Shared trigger. The column DEFAULT alone is NOT enough: a client that serializes
-- tenant_id: null suppresses the default, and the RESTRICTIVE WITH CHECK then
-- silently rejects the row. This trap cost 519 tables during the self-host cutover.
CREATE OR REPLACE FUNCTION public.set_tenant_id_default() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := current_tenant_id(); END IF;
  RETURN NEW;
END $$;

-- 1. Score bank: REPURPOSE the existing, empty gw_sight_reading_exercises.
--    Do not mint a new table — that re-creates the dead subsystem under a new name.
--    It ALREADY has: id, user_id, title, params jsonb, musicxml text, pdf_url,
--    created_at, updated_at, tenant_id. So we add only what's missing, and make
--    sure the tenant_id default + trigger are actually present (the column
--    existing does not mean the default or the trigger do).
ALTER TABLE public.gw_sight_reading_exercises
  ALTER COLUMN tenant_id SET DEFAULT current_tenant_id(),
  ADD COLUMN IF NOT EXISTS difficulty int,          -- 1..10, maps to the ladder
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
-- pdf_url stays, unused in v1 (MusicXML only). user_id means "who uploaded it".

-- 2. One assignment -> N exercises, so the gradebook keeps ONE entry. NET-NEW.
CREATE TABLE public.gw_sight_reading_assignment_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT current_tenant_id(),
  assignment_id uuid NOT NULL REFERENCES public.gw_assignments(id) ON DELETE CASCADE,
  exercise_id   uuid NOT NULL REFERENCES public.gw_sight_reading_exercises(id) ON DELETE RESTRICT,
  position      int  NOT NULL DEFAULT 0,
  UNIQUE (assignment_id, exercise_id)
);

-- 3. The ungraded practice ledger — deliberately OUTSIDE the gradebook. NET-NEW.
CREATE TABLE public.gw_sight_reading_attempts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL DEFAULT current_tenant_id(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  source          text NOT NULL DEFAULT 'self'
                    CHECK (source IN ('self','generator','assignment')),
  exercise_id     uuid REFERENCES public.gw_sight_reading_exercises(id) ON DELETE SET NULL,
  assignment_id   uuid REFERENCES public.gw_assignments(id) ON DELETE SET NULL,  -- CONTEXT, not a grade link
  inline_musicxml text,          -- ephemeral generated line, not persisted to the bank
  first_note_ok   boolean,
  pitch_accuracy  numeric(5,2),
  rhythm_accuracy numeric(5,2),
  retention       numeric(5,2),
  overall         numeric(5,2),
  detail          jsonb NOT NULL DEFAULT '{}'::jsonb,   -- per-note results
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

Every new or altered table gets the trigger **and** a RESTRICTIVE RLS policy
(`USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())`), plus an owner
policy on attempts (`user_id = auth.uid()`). Teacher-uploaded MusicXML lands in a tenant-prefixed storage
path so Tenant A can never read Tenant B's library.

### Attempt vs. submission

An **attempt** is practice: unlimited, ungraded, private to the student, rows in
`gw_sight_reading_attempts`. It carries `assignment_id` purely as context — never as a grade link.

A **submission** is the student choosing a take. It writes one `gw_assignment_submissions` row keyed on
`user_id`, auto-populating the gradebook. The teacher may override. Per decision 4, the recorded grade
reflects **completion**; the 0–100 rides along as feedback and does not drive it.

This is what lets a practice tool host assigned work without feeling graded: the assignment card is the
*only* place a due date appears, and the result screen never changes shape.

---

## Consolidation plan

Build **one new page component** at the canonical route **`/dashboard/sight-reading`**. Do not fix either
existing component in place — the file identities are genuinely confusing (the screenshot is
`member-sight-reading/MemberSightReadingStudio`; `SightSingingStudio` is live as the body of
`/sight-reading-generator`, wired to the placebo grader). A clean rebuild sidesteps that trap.

| Route | Action |
|---|---|
| `/dashboard/sight-reading` | **CANONICAL** — mount the new page here |
| `/member/sight-reading` | redirect → canonical |
| `/member-sight-reading-studio` | redirect, then delete the tree (`PracticeStudio` stat cards, second tab row, `GradeTracker` — which embeds grades in the Studio and violates decision 1) |
| `/sight-reading-generator` | salvage MusicXML generation + OSMD render out of `SightSingingStudio`, **drop `useGrading` → `assess-sight-singing`**, redirect, delete the rest |
| `/sight-reading-preview` | delete |
| `/sight-reading-submission` | delete (writes to empty `gw_scores` / `submissions`) |
| `/mus100-sight-singing` | delete (Spelman-era naming; violates tenant-neutral rule) |

Redirects, lazy-import removal, and tree deletion must land **atomically in one PR**, or dangling imports
break the ~2800-line `App.tsx` build. Repoint the `GleeWorldLanding` link.

**Salvage:** `sight-singing/utils/musicXMLParser.ts` (verified — it applies `<alter>` and loops all
measures), `hooks/useTonePlayback.ts`, the OSMD render path.
**Delete on sight:** anything touching `gw_scores`, `submissions`, `fy_cohorts`,
`gw_executive_board_members`. The `assess-sight-singing` and `evaluate-singing` edge functions both become
dead once `useGrading` is dropped; retire them rather than leaving a Whisper-based grader deployed.

**Deploy note:** never `rsync --delete` — it wipes `tenants/*/tenant-bootstrap.js`.

---

## First slice — one PR, no schema

> **"Kill the empty scoreboard; make generate → prime → hear → sing real."**

No new tables. No assignments. No grades persisted.

1. Mount the new page at `/dashboard/sight-reading`. Delete the 3 dead routes, redirect the other 3,
   delete the dead component trees and their lazy imports **in the same PR**. Repoint the landing link.
2. New page: one segmented control, **no stat cards**, Pitch Pipe as a chip, no theory. Library and
   Progress are empty-first placeholders this slice.
3. Practice/Generate: existing OSMD render + priming (I–IV–V–I + start pitch, synthesized from the IR) +
   existing `useTonePlayback` "hear it" + a **new AudioWorklet YIN/MPM pitch tracker** producing a live
   cents-off needle and the four-dimension result screen. **Visual only, scored on-device, nothing
   persisted, no backend, no MediaRecorder.**
4. Log to the existing `localStorage` key `gw_sight_reading_activity`. Zero schema risk.

This proves the single riskiest dependency — the iOS/Capacitor mic-to-cents path — on a **physical
iPhone**, before any database work. `getUserMedia` with `echoCancellation`, `noiseSuppression` and
`autoGainControl` all `false`; never hardcode 48000 Hz; verify the AudioWorklet module loads past the CSP
meta tag. **The simulator lies about audio.**

## Testing

The pitch tracker is the risk, so it gets tested first and hardest.

- **Pitch detection**, against synthesized reference tones: a 440 Hz sine must read A4 ±5 cents; a sung
  vowel with vibrato must not oscillate the note decision; silence must not register a note.
- **Scoring**, as pure functions over the IR + a note sequence: a perfect take scores 100; a take
  transposed down an octave scores 100 (octave forgiveness); a take a semitone flat throughout **fails
  first-note placement** but retains most pitch credit; a take with one wrong note then recovery scores
  near-perfect after the error (sequence alignment).
- **Generator**: every generated line begins and ends on a tonic-triad member; no leap exceeds the level's
  `maxLeap`; every tendency tone resolves. Property-based, run over hundreds of seeds.
- **RLS**, against a real database: student A cannot read student B's attempts; an insert with explicit
  `tenant_id: null` still lands with the correct tenant (the trigger test).
- **iOS**: mic permission denied → the line still renders and plays.

## Disagreements — and the calls made

**Prime the key, *and* forgive a whole-line semitone offset?** The pedagogy expert wanted both. They
fight: once you hand the student the tonic and the starting pitch, a persistent semitone offset **is** a
failure to place the first note — the hardest transferable skill in sight-singing. *Call:* first-note
placement becomes its own scored dimension (15%); octave forgiveness and sequence alignment stay;
arbitrary-semitone forgiveness is dropped.

**Which page is canonical?** The codebase expert named `SightReadingPage.tsx` and marked the real
screenshot component for deletion — inverted against the repo. *Call:* adopt neither identification.
Build fresh; salvage pieces. The rebuild is cheaper than untangling which live component is which, and it
avoids re-shipping the placebo grader hiding inside the "kept" generator.

**A new score-bank table?** The Academy expert invented `gw_sight_reading_scores`; the critic caught it
re-creating the dead subsystem under a new name, since `gw_sight_reading_exercises` already exists,
MusicXML-shaped and empty. *Call:* repurpose the existing table. Only the join table and the attempts
ledger are net-new.

**`student_id` vs `user_id`.** The proposed gradebook upsert wrote a nonexistent `student_id` column.
*Call:* key on `user_id`.

## Still open — product owner

1. **Gradebook grain:** one `gw_assignment_submissions` row aggregating the chosen takes, or one per
   exercise?
2. **May a teacher reweight the 15/45/25/15 rubric** per assignment (e.g. a rhythm-focused unit)?
3. **Who curates the score bank and assigns** — is `has_role('admin')` right, or does a Sight Reading
   class need a course-scoped instructor role?
4. **Attempt-audio retention**, if takes are ever persisted: every take, a cap per student, or only the
   promoted one? (v1 persists no audio.)

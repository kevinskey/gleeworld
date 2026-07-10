# In-app notation editor — design

**Date:** 2026-07-10
**Status:** design — awaiting product-owner review
**Branch:** `docs/notation-editor-design`

## The ask

Teachers build a sight-reading exercise **with keyboard and mouse only** — no MuseScore, no
Finale, no external software — save it as MusicXML into the score library, and assign it to a
class or a student. They can also **open an existing MusicXML** (an upload, or a generated
exercise) and edit it.

## Scope decision, recorded

The product owner chose to build a **full notation editor on VexFlow, from scratch**, over two
narrower options (a constrained single-line editor; embedding a commercial editor like
Flat/Noteflight/Soundslice). The reasoning against the alternatives is preserved here so the
decision is legible later:

- **No drop-in exists.** The repo already ships three notation *renderers* — VexFlow 5, OSMD 1.9,
  Verovio 6 — and **none of them edits**. There is no free, embeddable, MusicXML-exporting WYSIWYG
  editor for the web. So "full editor" means either building one or renting one.
- **Commercial embed** (Flat/Noteflight/Soundslice) buys full power in days, but the score data
  leaves the platform to a third party, it needs a CSP `frame-src` grant, and it cuts against
  GleeWorld's tenant-neutral, self-hosted posture. Rejected.
- **A full engraving tool is a program of work, not a slice.** Notation layout is famously
  edge-case-dense (beaming, collision avoidance, cross-staff, ties across systems). This document
  is therefore a **phased roadmap**, and only Phase 1 is specified to implementation depth. Phases
  2–5 are scoped enough to protect the architecture, and each is a later spec of its own.

**This is one design document by request. It is NOT one implementation plan.** Each phase is
planned and built as its own slice; a single monster plan is exactly how a build this size fails.

## North-star architecture (fixed from Phase 1)

Three boundaries carry the whole roadmap. Getting them right in Phase 1 is what keeps Phases 2–5
from being rewrites.

### 1. `EditorScore` — the document model, distinct from `ExerciseIR`

The Sight Reading Studio already has `ExerciseIR` (`src/lib/sightReading/ir.ts`): single-voice,
single-staff, scoring-shaped. **The editor must not use it as its document model** — it cannot
represent a second voice, a grand staff, dynamics, or lyrics, all of which Phases 3–4 add.

The editor gets its own model, `EditorScore`, rich enough for the *entire* roadmap even though
Phase 1 only populates a subset:

```
EditorScore {
  divisions: number                       // MusicXML ticks per quarter
  parts: Part[]                            // Phase 1: exactly one
}
Part { id, name, clef, staves: Staff[] }   // Phase 1: one staff; Phase 3: grand staff = two
Staff {
  keyFifths: number, mode
  timeSig: { beats, beatType }
  measures: Measure[]
}
Measure {
  voices: Voice[]                          // Phase 1: one; Phase 3: multiple
  attributes?: { keyFifths?, timeSig?, clef? }  // mid-piece changes (Phase 2)
}
Voice { elements: (Note | Rest | Chord)[] }
Note {
  step, octave, alter                      // pitch
  durationTicks, dotCount, tie?, tuplet?   // rhythm (dots/tuplets Phase 2)
  articulations?, slur?, lyric?            // Phase 4
}
```

`ExerciseIR` becomes a **projection** of `EditorScore`, not its parent:
`editorScoreToIR(score): ExerciseIR | null` — returns `null` when the score has more than one
voice/staff (nothing to score against a single-line student take). Phase 1 always yields an IR
because Phase 1 scores are single-line. Later phases may return `null`, and the assignment UI
degrades gracefully (see "Assignment").

### 2. Command pattern — every edit is a reversible `Command`

The document is never mutated directly. Each edit — place note, change duration, delete, transpose,
set key — is a `Command` with `apply(score)` and `invert(score)`. Phase 1 needs this discipline
even though undo/redo is a Phase 5 feature, because retrofitting reversibility onto direct
mutation is the single most expensive way to add undo later.

```
interface Command { readonly label: string; apply(s: EditorScore): EditorScore; invert(s: EditorScore): EditorScore }
class CommandStack { do(cmd), undo(), redo(), canUndo, canRedo }   // Phase 1 uses do(); undo/redo wired in Phase 5
```

Edits are pure and immutable-returning, so React state updates and (later) undo are trivial.

### 3. MusicXML is the boundary format — read AND write, both Phase 1

Because the editor must **open existing files**, the MusicXML layer is bidirectional from day one:

- `musicXmlToEditorScore(xml): EditorScore` — a full reader producing the document model.
  Distinct from the existing `parseMusicXML` (`src/lib/sightReading/musicXMLParser.ts`), which
  produces the scoring-shaped `ParsedScore` in *seconds* and drops everything the editor needs
  (voices, ties, exact divisions, key/clef). The editor needs a faithful, tick-accurate reader.
- `editorScoreToMusicXML(score): string` — the writer. **New**; the repo has no MusicXML writer
  today (only readers and PDF/MP3 renderers). Emits `score-partwise` 3.1.

The two must round-trip: `read(write(score))` deep-equals `score` for everything the current phase
supports. This is a hard test gate (see Testing) and it is what makes "open, edit, re-save"
trustworthy.

Rendering stays with **VexFlow 5** (already a dependency). VexFlow draws from a per-render
translation of `EditorScore`; the editor never hand-builds VexFlow objects as its source of truth.

---

## Phase 1 — single-line editor + save + assign (specified to depth)

**Delivers the original ask in full:** a teacher authors (or opens and edits) a one-voice,
one-staff exercise entirely with keyboard and mouse, saves it as MusicXML into the library, and
assigns it to a class or a student. Single-line scores derive an `ExerciseIR`, so the existing
on-device scorer works against student takes with no new scoring code.

### Where it lives

The Sight Reading Studio (`/dashboard/sight-reading`, shipped in the slice-1 rebuild) gains an
authoring surface. Its **Library** tab gets a **Create exercise** button and an **Edit** action on
each library row. Both open the editor at `/dashboard/sight-reading/editor` (new blank) or
`/dashboard/sight-reading/editor/:exerciseId` (open existing). The dead `ScoreLibraryManager`
screen (orphaned by PR #129, still visible only because that PR is undeployed) is **not** where
this goes — it is retired, not extended.

### Who can author and assign

Gated on `has_role('admin')` OR a course-instructor check. **Open decision** (see end): whether a
Sight Reading class needs a distinct course-scoped instructor role, or platform/tenant admin is
enough for v1. Default for the spec: `has_role('admin')`; students never reach the editor route.

### The editing surface

```
+-----------------------------------------------------------------------+
|  < Library     Untitled exercise            [ Play ] [ Save ] [ ... ] |
+-----------------------------------------------------------------------+
|  Key [C v]  Mode [Major v]  Time [4/4 v]  Clef [Treble v]  Tempo [120] |
+-----------------------------------------------------------------------+
|  Duration:  ( o )( d )( q* )( e )( s )     Rest [ r ]   Tie [ _ ]      |
|             whole half quarter eighth 16th                             |
+-----------------------------------------------------------------------+
|                                                                       |
|   &====================================================               |  <- VexFlow staff
|   |  q   q   q   q  |  h      q   q |  ...                             |
|                                                                       |
+-----------------------------------------------------------------------+
```

**Mouse:** click a duration in the palette to arm it; click a vertical position on the staff to
place a note of that duration at that pitch at the current insertion point; the insertion point
advances. Click an existing note to select it; drag it vertically to change pitch.

**Keyboard** (the "keyboard only" requirement — the whole exercise is authorable without the mouse):
- Letter keys `A`–`G` place a note of the armed duration at that pitch nearest the last one.
- Number keys `1`–`6` arm whole/half/quarter/eighth/16th/32nd. `.` toggles a dot **iff dotted notes
  are pulled into Phase 1** (decision #4); if held to Phase 2, the dot control is absent in Phase 1,
  not a visible no-op. The spec does not ship a button that does nothing.
- `↑`/`↓` transpose the selected note by a step; `Shift`+`↑`/`↓` by an octave.
- `←`/`→` move the insertion point / selection.
- `R` inserts a rest of the armed duration. `T` ties the selected note to the next.
- `Backspace`/`Delete` removes the selected element. `Ctrl/Cmd+Z` — wired in Phase 5; Phase 1 may
  stub it visibly disabled.

**Barlines are computed, never drawn by hand.** The engine fills measures from the time signature;
placing notes past a barline starts the next measure. An over-full measure is flagged (a red
measure tint) rather than silently truncated. This is the single most important correctness rule
in the editor and it is enforced in the model, not the UI.

**Live validation:** each measure's filled duration is checked against the time signature; the
Save button is enabled only when every measure is complete (or the teacher confirms an intentional
pickup/partial — Phase 2 formalizes pickups; Phase 1 requires complete measures).

### Playback

A **Play** button synthesizes the current `EditorScore` and plays it, reusing the Studio's
`useTonePlayback` path. A teacher must be able to *hear* what they wrote before assigning it. The
notes highlight as they sound. This is not a Phase 5 nicety — an authoring tool the teacher can't
audition is a trap.

### Save

Save serializes `EditorScore → MusicXML` and upserts a `gw_sight_reading_exercises` row (the table
exists, with `musicxml text`, `params jsonb`, `title`, `user_id`, `tenant_id`):
- `musicxml` — the full document (the portable, editable source of truth).
- `params` — `{ key, mode, timeSig, clef, tempo, difficulty }` plus the derived `ir` when the
  score is single-line, so the assignment/scoring path needs no re-parse.
- `tenant_id` — via the column DEFAULT `current_tenant_id()` **and** a `BEFORE INSERT` trigger,
  because a restrictive RLS `WITH CHECK` silently rejects an insert that serializes `tenant_id:
  null`. (The recurring cutover trap — see the sight-reading spec.)

Opening an existing exercise reads its `musicxml` through `musicXmlToEditorScore`, edits it, and
re-saves to the same row. Round-trip fidelity (§ North-star 3) is what makes this safe.

### Assignment

A teacher assigns the saved exercise to a **class** (`gw_academy_course`) or an individual
**student** (`user_id`), due on a date. This reuses the assignment schema the Sight Reading Studio
spec already designed (`docs/superpowers/specs/2026-07-09-sight-reading-studio-redesign-design.md`)
and which slice 1 deliberately did not build. **This phase builds it:**

```sql
-- Shared trigger: coalesce an explicit NULL tenant_id back to the tenant, because the
-- column DEFAULT is suppressed when a client serializes tenant_id: null, and the
-- RESTRICTIVE RLS WITH CHECK then silently rejects the row.
CREATE OR REPLACE FUNCTION public.set_tenant_id_default() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := current_tenant_id(); END IF; RETURN NEW; END $$;

-- The score bank already exists (gw_sight_reading_exercises). Ensure its tenant plumbing:
ALTER TABLE public.gw_sight_reading_exercises
  ALTER COLUMN tenant_id SET DEFAULT current_tenant_id(),
  ADD COLUMN IF NOT EXISTS difficulty int,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
-- (RLS + trigger added if absent; see the sight-reading spec for policy shapes.)

-- One assignment -> N exercises, keeping the gradebook to one row. NET-NEW.
CREATE TABLE public.gw_sight_reading_assignment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  assignment_id uuid NOT NULL REFERENCES public.gw_assignments(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.gw_sight_reading_exercises(id) ON DELETE RESTRICT,
  position int NOT NULL DEFAULT 0,
  UNIQUE (assignment_id, exercise_id)
);
```

- The assignment itself is an ordinary `gw_assignments` row (`assignment_type='sight_reading'` —
  which is plain text, no enum, so it is simply a string we start writing; `course_id`, `due_at`,
  `points`, `created_by`).
- **Individual-student assignment (RESOLVED — build in Phase 1):** `gw_assignments` is course-only
  today (no assignee column; per-student is modeled at the submission level). Phase 1 adds a
  **nullable `student_id uuid REFERENCES auth.users(id)`** to `gw_assignments`. `student_id IS NULL`
  is the existing behavior — a course-wide assignment every enrolled student receives. `student_id`
  set targets exactly that one student. **Blast-radius rule:** this table is shared by every
  assignment type, so the migration is purely additive (nullable, no default beyond NULL), and the
  regression test asserts existing course-only assignment resolution is byte-identical when
  `student_id IS NULL`. Assignment *resolution* ("which students see assignment X") gains one clause:
  a student sees X if `X.student_id = me` OR (`X.student_id IS NULL` AND I'm enrolled in
  `X.course_id`).
- When a single-line exercise is assigned, the student practices it in the Studio's sing flow and
  the on-device scorer runs — the loop is already built. When (a later phase) a multi-voice score
  is assigned, `editorScoreToIR` returns `null`; the assignment still works as **read/play/attest**
  practice, but auto-scoring is unavailable and the UI says so rather than faking a score. (The
  product has just spent a PR removing a fake grader; nothing here reintroduces one.)

### Phase 1 explicitly excludes

Tuplets, pickups, mid-piece key/time changes, multiple voices, grand staff, dynamics,
articulations, slurs, lyrics, undo/redo, copy/paste. All are later phases. Dotted notes and ties
are the one boundary case — cheap to include (the `Note` model already carries `dotCount`/`tie`),
so decision #4 pulls them into Phase 1 or holds them; the spec ships whichever, with no half-state. Phase 1 ships a
**complete, honest single-line authoring-and-assignment loop** and the foundation the rest extends.

---

## Phases 2–5 (roadmap depth, each its own future spec)

**Phase 2 — rhythmic depth.** Dotted notes, ties across barlines and systems, tuplets
(triplets first), pickup/anacrusis measures, mid-piece key and time changes. Extends `Note`
(`dotCount`, `tuplet`), `Measure.attributes`, the reader/writer, and the VexFlow translation.
Round-trip tests extend to cover each.

**Phase 3 — multiple voices and staves.** A second voice in a measure (stems up/down); the grand
staff (two staves, one part) for keyboard reading; part naming. This is where `editorScoreToIR`
starts returning `null` and the assignment UI's "no auto-score" path earns its keep. VexFlow voice
formatting and collision handling is the hard part.

**Phase 4 — expression.** Dynamics, hairpins, articulations, slurs, tempo/text marks, lyrics under
notes. Mostly additive to `Note`/`Measure` and the MusicXML layer; little new interaction model.

**Phase 5 — editor craft.** Undo/redo (the `CommandStack` built in Phase 1 is finally exposed),
copy/paste and range selection, playback-follows-cursor while editing, and richer import handling
(partial/odd MusicXML from third-party tools). No new document concepts — this phase is polish and
the payoff of the Phase 1 command discipline.

---

## Testing (Phase 1)

The document/format core is pure and gets tested first and hardest — it is where correctness lives.

- **MusicXML round-trip** (the headline gate): for a corpus of hand-written `EditorScore` fixtures
  covering every Phase 1 construct (each duration, rests, ties, each clef, several keys/times),
  `musicXmlToEditorScore(editorScoreToMusicXML(s))` deep-equals `s`. And for a corpus of real
  MusicXML files (an export from MuseScore, a generated exercise), reading then writing then
  reading again is stable.
- **Commands**: every `Command`'s `invert(apply(s))` deep-equals `s` — proves Phase 5 undo before
  it is wired.
- **Barline/measure engine**: placing notes past a barline opens the next measure; an over-full
  measure is flagged, never silently truncated; a time-signature change reflows correctly.
- **`editorScoreToIR`**: a single-line score yields an IR the existing scorer accepts; a
  (fixture) multi-voice score yields `null`.
- **RLS**: a teacher in tenant A cannot read/assign tenant B's exercises; an insert serializing
  `tenant_id: null` still lands with the correct tenant (the trigger regression test).
- **Editor interaction** (component level): keyboard entry of a short melody produces the expected
  `EditorScore`; Save is disabled while a measure is incomplete; opening an exercise and re-saving
  without edits does not change its MusicXML.

The rendering (VexFlow output pixels) is verified by eye on real devices, not asserted in unit
tests — same posture as the sight-reading slice.

## Migration / rollout

Phase 1 is additive: the two assignment-side tables, the `gw_sight_reading_exercises` tenant
plumbing, the editor route, and the Studio Library entry points. No existing data changes; the
feature is invisible until a teacher opens the editor. Deploy order: migration → build → the route
is dark until linked.

## Decisions — resolved 2026-07-10

1. **Individual-student assignment — BUILD IN PHASE 1.** Add a nullable `student_id` to
   `gw_assignments` (see Assignment section for the additive-migration + regression rule). Class
   assignment (`student_id IS NULL`) and single-student assignment both ship in Phase 1.
2. **Authoring permission — `has_role('admin')`.** Tenant/platform admins author and assign;
   students never reach the editor route. A course-scoped instructor role is a later addition if
   non-admin teachers need access.
3. **Dotted notes — PHASE 1.** The palette and keyboard include a dot toggle; the MusicXML
   reader/writer and VexFlow translation handle dotted durations. (Ties also, as the model already
   carries `tie`.)

### Still deferred (do not block Phase 1)

- **Multi-voice-assignment behavior** (Phase 3+): when an exercise can't be auto-scored
  (`editorScoreToIR` returns `null`), assigning it is allowed as attest-only practice, not blocked.
  Confirm when Phase 3 is specced.

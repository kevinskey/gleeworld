# Sight Singing and Aural Skills — Template Course Design

**Date:** 2026-07-10
**Status:** Approved
**Owner:** Kevin Johnson

## Summary

Build "Sight Singing and Aural Skills," a 15-week course with 15 module assignments, as a family of four sellable **template courses** (elementary, middle school, high school, college) in the Glee Academy template system (System A: `gw_academy_courses → gw_academy_units → gw_academy_lessons → gw_academy_exercises`), with **interactive notated exercises** rendered in-course by a new `ExercisePlayer`, seeded through the existing `scripts/seed-course-templates.mjs` pipeline, and wired to `gw_course_product` store products with pricing deferred.

The full pedagogical source spec (weekly topics, assignments, grading tables, preparation process) is reproduced in Appendix A and is the content authority for the college level.

## Goals

1. A tenant can adopt any of the four Sight Singing template courses and get a complete, teachable 15-week curriculum with real notated exercises — not a syllabus skeleton.
2. Exercises render and play **inside the template course page** (notation + audio), with sight-singing melodies deep-linking into the Sight Reading Studio's pitch tracker for practice.
3. The course family is store-ready: five `gw_course_product` rows (four levels + bundle) following the History of Choral Music pattern, prices deferred until launch.
4. Everything survives `adopt_template_course` cloning with zero schema changes to the clone path.

## Non-Goals

- No bridge between the academy template system and the System B quiz engine (`gw_course_tests`/`gw_course_test_questions`). Ear-training checks are self-graded client-side.
- No dictation **input** UI (students self-check against a revealed answer score); a notation-input dictation flow is a later phase.
- No recorded-submission/grading flow in this build. Recorded module assignments are performed in live-class context later via `gw_sight_reading_assignments` + `gw_assignment_submissions` (which already support recording URL + AI pitch/rhythm scoring).
- No Stripe prices. `stripe_price_id` stays null (adoption ungated), consistent with add-on billing being disengaged until launch.

## Architecture

### Content model (System A, existing tables — no migrations to core schema)

- **4 template courses**, one per level, `tenant_id = null`, `is_template = true`:
  - `sight-singing-elementary` (grades K–5)
  - `sight-singing-middle` (grades 6–8)
  - `sight-singing-high` (grades 9–12)
  - `sight-singing-college` (college/adult)
- **15 units per course**, titled `Week N: <Topic>` (sort_order = week − 1).
- **3 lessons per unit**:
  1. **Concepts & Warm-ups** — objectives, instructional content (`content` text), solfège/rhythm drill exercises.
  2. **Guided Practice** — interval/ear-training exercises and practice melodies with notation.
  3. **Module Assignment** — the week's assignment: deliverables, submission expectations, rubric.
- **Exercises** attach to lessons as `gw_academy_exercises (type, data jsonb)`.

Week 8 is always the midterm module and Week 15 the final examination + growth portfolio, at every level.

### Level differentiation

| Level | Scope |
|---|---|
| College | Source spec verbatim: movable-do major/minor (la-based minor documented), simple + compound meter, syncopation, chromatic solfège, modulation to closely related keys, 5/8 and 7/8, two- to four-part open score. |
| High school | Same 15-week arc; melodies narrower in range (≤ M9), modulation limited to dominant and relative keys, mixed meter introduced lightly (one 5/8 exercise), two-part emphasis instead of four-part open score. |
| Middle school | Diatonic major and la-based minor only; simple + compound meter; intervals through the P5; chromatic and modulation weeks replaced with rounds, partner songs, and pentatonic reading; two-part limited to canons. |
| Elementary | Kodály-style progression: so-mi → so-mi-la → pentatonic → full do-scale; rhythm syllables (ta / ti-ti / rest); echo singing, movement, and short dictation games; assignments are short recorded echoes and pattern games rather than formal melodies. |

Every level keeps the same unit/lesson skeleton so the ExercisePlayer and adopt flow are level-agnostic.

### Exercise types and `data` schema

All notation is stored as the Sight Reading Studio's **ExerciseIR** (`src/lib/sightReading/ir.ts`): `{ key, mode, tonicMidi, meter: {beats, beatType}, tempo, notes: [{midi, beatPos, durationBeats, solfege, phraseIdx}], phrases, difficulty }`. This is the format the studio, the VexFlow render path (`irToEditorScore` → `NotationView`), and IR playback already consume.

| `type` | `data` shape | Player behavior |
|---|---|---|
| `solfege_drill` | `{ ir, instructions }` | Render notation with solfège syllables; playback button. |
| `melody` | `{ ir, instructions, prepChecklist: string[] }` | Render notation + playback + **Practice in Sight Reading Studio** deep link (loads IR into the pitch tracker). |
| `rhythm` | `{ ir, syllableSystem }` | Rhythm-only staff render; click-track playback. |
| `ear_training` | `{ prompt, playIr, choices: string[], answer: number, explanation }` | Play audio (no notation shown), multiple-choice, client-side grading with explanation reveal. |
| `dictation` | `{ prompt, playIr, answerIr, playLimit }` | Play the example up to `playLimit` times, then reveal `answerIr` as a score for self-check. |
| `assignment` | `{ instructions: string[], deliverables: string[], rubric: [{criterion, percent}] }` | Module assignment card: numbered instructions, deliverables list, rubric table. |

Unknown types keep today's badge fallback so old/new content never breaks the page.

### UI: ExercisePlayer

- New component tree under `src/components/academy/exercise-player/`: `ExercisePlayer.tsx` (type switch) + one card per type.
- Mounted in `src/pages/academy/TemplateCoursePage.tsx`, replacing the current type-badge rendering of exercises (`data` is already fetched by the page query; it is currently unused).
- Notation: reuse `irToEditorScore` + `NotationView` (VexFlow). Playback: reuse the studio's IR playback path.
- **Studio deep link:** the Sight Reading Studio gets a small loader that accepts an academy exercise id (e.g., `/sight-reading?academyExercise=<id>`), fetches the exercise row, and loads its `data.ir` into the practice flow in place of a generated exercise. RLS: template rows are `tenant_id = null, is_template = true` and already readable on the template page; the loader uses the same access path.
- Styling follows the GleeWorld design system (light surfaces, text-xs/text-sm chrome). `gleeworld-design` skill governs implementation.

### Content generation pipeline

4 levels × 15 weeks × ~5 exercises ≈ **300+ notated exercises** — too many to hand-author reliably.

- New script `scripts/generate-sight-singing-course.mjs`:
  - Input: per-level, per-week **constraint specs** encoded in the script (key set, range, allowed interval set, rhythm palette, phrase length, meter(s), chromatic/modulation rules) that implement the pedagogy in Appendix A.
  - Canonical drills (scales, do–sol–do, tonic-triad arpeggios, chromatic solfège drill, minor-scale forms) are **hand-authored IR**, not generated.
  - Melodies/rhythms are generated deterministically from a fixed seed (stable re-runs → idempotent seeding) with musical constraints: stepwise recovery after leaps, leaps only from the allowed set, phrase-final resolution to stable scale degrees, singable contour (no more than two consecutive leaps, range enforcement per level).
  - Output: `scripts/sight-singing-courses.json` in the exact `{ template_courses: [...] }` shape `seed-course-templates.mjs` expects.
  - Generated melodies are human-reviewed for musicality per level before seeding.
- Seeding: `node scripts/seed-course-templates.mjs sight-singing-courses.json | psql` (existing pipeline, idempotent on course `slug`).

### Store products

Five `gw_course_product` rows added to the seed, mirroring the HCM pattern:

| SKU | level | template_course_id | bundle_key | price |
|---|---|---|---|---|
| `COURSE-SSAT-ELEM` | elementary | → sight-singing-elementary | `sight-singing` | deferred |
| `COURSE-SSAT-MS` | middle_school | → sight-singing-middle | `sight-singing` | deferred |
| `COURSE-SSAT-HS` | high_school | → sight-singing-high | `sight-singing` | deferred |
| `COURSE-SSAT-COLL` | college | → sight-singing-college | `sight-singing` | deferred |
| `COURSE-SSAT-BUNDLE` | null | null | `sight-singing` | deferred |

`stripe_price_id` null on all rows (keeps `adopt_template_course` ungated). "Deferred" = whatever null/zero convention `gw_course_product.price_cents` permits — determined at implementation from the column definition; if NOT NULL, use 0 with `active = true`. Bundle expansion at grant time already works via `grant_course_entitlement` on `bundle_key`.

Note: the seed script currently hardcodes the HCM product rows; the product block must be generalized or the SSAT products emitted by the new generator's JSON→SQL step without disturbing HCM seeding idempotency (`on conflict (sku) do nothing` already protects it).

## Phasing

1. **Phase 1:** College course fully authored (constraint specs + hand drills for all 15 weeks) + ExercisePlayer + studio deep-link loader + generator/seed pipeline + all 5 products. Deployed and verified.
2. **Phase 2:** Elementary, middle, and high school content (constraint specs + drills only — the player and pipeline are already built).
3. **Later (out of scope):** dictation input UI, recorded-submission assignments in live classes (`gw_sight_reading_assignments` linkage), Stripe prices via the pricing analysis.

## Error handling

- ExercisePlayer treats malformed/missing `data` as the badge fallback (never a crashed lesson page).
- IR validation helper (meter math: note `beatPos + durationBeats` fits measures; midi range sanity) runs in the generator **and** defensively in the player before render.
- Studio loader falls back to the studio's normal generated-exercise flow if the academy exercise id is missing or unreadable.

## Testing

- Generator: unit checks that every generated exercise passes IR validation and per-week constraint specs (range, interval set, rhythm palette).
- Seed: run twice against a scratch DB → second run is a no-op (slug + sku idempotency).
- ExercisePlayer: renders every exercise `type` from real seeded college-course data; unknown type falls back to badge.
- Adopt: `adopt_template_course` on a test tenant carries all units/lessons/exercises with `data` intact.
- End-to-end on local preview (phone + desktop viewports): open template course → expand a week → play a melody → deep-link into Sight Reading Studio → exercise loads in the pitch tracker.

---

## Appendix A: Source course specification (college level — content authority)

### Course Description

This course develops the ability to read, hear, understand, and perform notated music accurately at sight. Students will practice movable-do solfège, rhythmic reading, interval recognition, melodic dictation, harmonic hearing, and ensemble sight singing. The course progresses from stepwise diatonic melodies to chromatic, modulating, and rhythmically advanced examples.

### Course Learning Outcomes

By the end of the course, students will be able to:

1. Sight-sing diatonic and chromatic melodies using solfège syllables.
2. Maintain a steady pulse while performing increasingly complex rhythms.
3. Recognize and sing intervals, scales, triads, and seventh chords.
4. Identify tonal function and harmonic progression by ear.
5. Notate short melodic and rhythmic examples from dictation.
6. Perform independent vocal lines in two-, three-, and four-part textures.
7. Prepare and submit professional-quality recorded sight-singing performances.
8. Evaluate personal accuracy in pitch, rhythm, intonation, and musicianship.

### Week 1: Foundations of Sight Singing

**Topics:** Course procedures and diagnostic assessment; establishing tonic; movable-do solfège; major scale patterns; stepwise melodies; quarter/half/whole notes and rests; basic conducting patterns.

**Module Assignment 1: Major Scale and Diagnostic Recording** — Sing the major scale ascending and descending using solfège. Sing tonic, dominant, and tonic: do–sol–do. Perform an eight-measure stepwise melody in 4/4. Record the melody without instrumental doubling. Submit a brief reflection identifying two strengths and two areas for improvement. *Assessment: pitch accuracy, rhythm, steady tempo, solfège accuracy, vocal confidence.*

### Week 2: Simple Meter and Melodic Direction

**Topics:** 2/4, 3/4, 4/4; measures, bar lines, strong and weak beats; repeated notes; stepwise motion; skips within the tonic triad; conducting while singing.

**Module Assignment 2: Simple-Meter Sight-Singing Set** — Three short melodies (one each in 2/4, 3/4, 4/4), each including stepwise motion, repeated notes, and tonic-triad skips. One continuous video showing correct conducting patterns.

### Week 3: Intervals and Tonic-Triad Melodies

**Topics:** Major/minor seconds and thirds; perfect fourths and fifths; tonic-triad arpeggiation; audiation before singing; interval recognition by sound.

**Module Assignment 3: Interval Singing and Melodic Application** — Sing assigned intervals above and below a starting pitch. Identify ten recorded melodic intervals. Sight-sing a melody containing thirds, fourths, and fifths; mark each melodic interval in the score before recording. *Written component: interval labels and solfège analysis.*

### Week 4: Eighth Notes and Rhythmic Subdivision

**Topics:** Paired eighth notes; dotted-quarter + eighth patterns; beat subdivision; rhythm syllables; maintaining tempo without accompaniment; rhythmic error identification.

**Module Assignment 4: Rhythm Performance Portfolio** — Speak or clap five eight-measure rhythm exercises, conducting while performing. Perform one rhythm on a neutral syllable. Correct a provided rhythm containing five notation or performance errors. Submit a recording with a metronome count-in.

### Week 5: Minor Keys

**Topics:** Natural, harmonic, melodic minor; la-based minor; minor-key tonic–dominant relationships; raised 6̂ and 7̂.

**Module Assignment 5: Minor-Mode Sight Singing** — Sing all three minor scale forms. Perform one melody in natural minor and one in harmonic or melodic minor. Identify altered scale degrees in the score. Explain whether la-based or do-based minor was used.

### Week 6: Compound Meter

**Topics:** 6/8, 9/8, 12/8; beat division into three; dotted-quarter pulse; compound conducting patterns; simple vs. compound comparison; ties across subdivisions.

**Module Assignment 6: Compound-Meter Performance** — Clap one exercise in 6/8 and one in 9/8. Sight-sing a sixteen-measure melody in compound meter, conducting the correct pattern. Identify whether each beat divides into two or three parts. Submit a written count or rhythm-syllable analysis.

### Week 7: Diatonic Harmony and Chord Functions

**Topics:** Tonic/predominant/dominant function; I, IV, V, vi; chord-tone melodies; singing chord roots; harmonic dictation; cadences.

**Module Assignment 7: Harmonic Function and Chord-Tone Singing** — Sing root, third, and fifth of I, IV, and V. Identify eight short progressions by Roman numeral. Sight-sing a melody outlining tonic, subdominant, and dominant chords; label harmonic function beneath each measure; identify the final cadence.

### Week 8: Midterm Sight-Singing Assessment

**Topics:** Review of major/minor keys, simple/compound meter, intervals through the octave, rhythmic subdivision; preparation procedures for unfamiliar music; performance under time limits.

**Module Assignment 8: Midterm Examination** — (1) one prepared melody; (2) one unprepared major-key melody; (3) one unprepared minor-key melody; (4) one rhythm-reading exercise; (5) five interval-identification examples; (6) one short melodic dictation. Limited preparation time for unprepared examples.

### Week 9: Syncopation and Advanced Rhythm

**Topics:** Syncopation; ties across beats; offbeat entrances; sixteenth-note patterns; dotted-eighth + sixteenth; maintaining internal pulse.

**Module Assignment 9: Syncopation Challenge** — Perform four syncopated rhythm exercises. Sight-sing a melody containing ties, offbeat entrances, and sixteenth notes. Record one version with conducting and one without. Mark all syncopations and tied notes in the score. Describe the strategy used to maintain pulse.

### Week 10: Two-Part Sight Singing

**Topics:** Singing independent lines; maintaining pitch against another voice; parallel/contrary/oblique/similar motion; two-part canons; balance and intonation; ensemble listening.

**Module Assignment 10: Two-Part Ensemble Recording** — With a partner or via multitrack: one two-part rhythmic exercise, one canon, one two-part tonal example. Submit the ensemble recording, an isolated recording of one's own part, and a short evaluation of balance, tuning, and rhythmic independence.

### Week 11: Chromatic Alterations

**Topics:** Chromatic passing and neighbor tones; raised/lowered scale degrees; chromatic solfège syllables; temporary tonicization; maintaining tonal center.

**Module Assignment 11: Chromatic Solfège Study** — Sing a chromatic solfège drill. Identify all altered scale degrees in an assigned melody. Sight-sing a melody containing at least five chromatic pitches, resolving each correctly. Submit an annotated score with solfège syllables.

### Week 12: Modulation and Changing Tonal Centers

**Topics:** Closely related keys; pivot chords; identifying a new tonic; modulation to dominant and relative major/minor; reestablishing solfège after modulation; phrase-level analysis.

**Module Assignment 12: Modulating Melody Analysis and Performance** — Analyze a melody that modulates to a closely related key: circle the modulation point, identify both keys, write solfège before and after the modulation, and perform the complete melody clearly establishing both tonal centers.

### Week 13: Mixed Meter and Changing Meter

**Topics:** Alternating 2/4, 3/4, 4/4; 5/8 and 7/8 groupings; additive rhythm; changing conducting patterns; maintaining subdivision during meter changes; irregular phrase structure.

**Module Assignment 13: Mixed-Meter Performance Project** — Perform one rhythm exercise with changing simple meters and one in 5/8 or 7/8, labeling beat groupings (2+3, 3+2). Sight-sing a melody containing at least three meter changes, conducting or visibly indicating the changing beat structure.

### Week 14: Advanced Ensemble and Score Reading

**Topics:** Three- and four-part score reading; open score; singing inner voices; clef awareness; independent entrances; tuning chords vertically; ensemble leadership.

**Module Assignment 14: Small-Ensemble Sight-Singing Project** — Perform a three- or four-part example in a small ensemble with limited rehearsal time, demonstrating independent entrances and sustained tuning. Each student submits an individual rehearsal plan and a peer + self-assessment.

### Week 15: Final Sight-Singing Examination and Reflection

**Topics:** Comprehensive review; efficient score preparation; error recovery during performance; musical expression at sight; continuing personal development.

**Module Assignment 15: Final Examination and Growth Portfolio** — (1) one prepared advanced melody; (2) one unprepared diatonic melody; (3) one unprepared chromatic or modulating melody; (4) one advanced rhythm exercise; (5) one two-part or ensemble excerpt; (6) one melodic dictation; (7) one harmonic-identification exercise. Portfolio: Week 1 diagnostic recording, Week 8 midterm recording, Week 15 final recording, a one-page reflection describing measurable improvement, and a personal practice plan.

### Suggested Weekly Course Structure

Each weekly module may include: instructional video or lecture; solfège warm-up; rhythm drill; interval or chord recognition exercise; guided practice melody; independent sight-singing melody; ear-training quiz; module assignment.

### Suggested Grading

| Course Component | Percentage |
|---|---:|
| Modules 1–7 | 28% |
| Midterm Examination | 15% |
| Modules 9–14 | 24% |
| Final Examination and Portfolio | 20% |
| Weekly Practice and Participation | 10% |
| Professionalism and Preparation | 3% |
| **Total** | **100%** |

Per-assignment rubric:

| Category | Percentage |
|---|---:|
| Pitch Accuracy | 30% |
| Rhythmic Accuracy | 30% |
| Solfège and Music-Reading Accuracy | 15% |
| Steady Tempo and Conducting | 10% |
| Tone, Intonation, and Musicianship | 10% |
| Submission Quality and Reflection | 5% |

### Recommended Sight-Singing Preparation Process

1. Identify the key and establish tonic. 2. Sing the scale and tonic triad. 3. Identify the meter and conduct the beat pattern. 4. Scan the rhythm without singing. 5. Locate difficult intervals and altered pitches. 6. Examine the opening and closing pitch. 7. Audiate the first phrase. 8. Begin at a steady, manageable tempo. 9. Continue through minor errors without stopping. 10. Evaluate the performance after completion.

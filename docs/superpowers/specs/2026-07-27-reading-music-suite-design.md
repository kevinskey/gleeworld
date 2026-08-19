# Reading Music — Musicianship Training Suite Design

**Status:** Draft synthesizing 3 expert consultations (curriculum, UI/UX, pedagogy). Awaiting Kevin's approval before implementation planning.
**Author (synthesis):** Claude, 2026-07-27
**Nav rebrand:** `Sight Reading` → `Reading Music`

## Vision (one paragraph)

A single K-through-college musicianship training suite that treats aural skills, sight-singing, rhythm, theory, and dictation as one continuous mastery tree — not as siloed apps. Teachers assign nodes to classes; students see one "Continue" button and a legible progression from 3rd-grade steady-beat to college-freshman modulation. Mic-based real assessment (not synthetic quizzes) makes the scores teachers actually trust. Kevin's edge over Yousician (weak on theory), Auralia (weak on classroom), and Sight Reading Factory (weak on grading) is: **teacher-first, K-college progression, real mic assessment, inside GleeWorld's existing classroom LMS and repertoire library.**

## Design decisions (from three expert reports, all converged)

| Question | Decision |
|---|---|
| Organizing metaphor | **Duolingo-style skill tree** wrapped in "conservatory" visual language (mastery rings + serif, not cartoon owls). Tree makes the prerequisite graph legible — you can't sight-sing chromatic before diatonic. |
| Gamification unit | **Mastery rings per skill node (0–100%)**, not XP bars. Universal from 8-year-old to college student. Streaks (student-set target, e.g. "3 days/week"), badges tied to musical milestones, invisible Elo for adaptive difficulty. **No hearts, no mascots, no global leaderboards.** |
| Feedback during a live sing | **One signal wins:** Yousician-style karaoke scroll with pitch trace. Note-pill row appears in the *results* panel, not during. Cents needle only in an opt-in "Tuner mode" for sustained-note exercises. |
| Nav sub-taxonomy | **Domain-based, not tool-based.** Six primary domains (below). |
| Mobile delivery | PWA piggy-backed on the existing GleeWorld iOS Capacitor wrapper. No separate native app. |
| Rhythm syllable system | **Takadimi as default** (HS-college, handles compound meter cleanly); **Kodály (ta/ti-ti)** and **1-e-and-a counting** as teacher-toggleable per class. Kodály required for elementary teachers to adopt. |
| Standards alignment | NAfME National Core Music Standards; AP Music Theory; ABRSM Grades 1-8; UIL/FVA/GMEA state adjudication tiers; MTNA/RCM. |
| Assessment | **Practice mode** (unlimited attempts, best kept) vs. **Assessment mode** (one attempt, recorded). Same UI, one flag. Teacher override always one click away. Always show waveform/piano-roll of what was sung next to target. |

## The critical guardrail: ear ≠ voice

**80% of K-12 students who "can't sight-sing" can audiate the pitch correctly — they just can't produce it vocally.** Voice change, "you can't sing" trauma, motor-mapping problems. The suite MUST separate aural identification from vocal production. Every ear-skill offers three answer modes:

1. **Click keyboard** (identify)
2. **Hum** (voice, no pitch label)
3. **Sing on solfège** (voice + label)

Scored separately so a student can be "level 7 ear, level 4 voice." Teacher sees both. This one design decision matters more than any gamification.

## The six primary domains

Ordered by pedagogical dependency. Each domain has its own tree column; the app-level "Continue" button jumps to whichever domain the adaptive engine says needs work.

### 1. Pitch & Intervals
Pitch matching (single note; existing GleeWorld tool goes here) → interval singing → interval identification (ear + labeled) → chord-quality ID → seventh-chord quality.

### 2. Rhythm (the new "Rhythm Machine")
Steady-beat tap → clap-back echo → read-and-clap simple meter (Takadimi/Kodály/count) → compound meter (6/8) → syncopation & tied figures → odd meters (5/8, 7/8) → polyrhythm (college).

### 3. Sight-Singing (flagship)
Pentatonic step-wise (do-re-mi) → diatonic step-wise → tonic-triad leaps → chromatic (di, ri, fi, si, li) → modal → atonal (college). **Pulls from the existing sight-singing generator + the new Repertoire catalog for "real music" examples.** Yousician-grade karaoke scroll + real-time pitch trace.

### 4. Melodic Dictation
Two-note interval echo → 2-bar diatonic → 4-bar stepwise → 4-bar with leaps → chromatic → modulating (college). Answer by clicking notation OR humming (both scored).

### 5. Harmony & Chords
Major/minor chord ID (2 choices) → 4 qualities → seventh chords → cadence ID (PAC/IAC/HC/Deceptive) → harmonic dictation (I-IV-V-I) → Roman numeral analysis (AP/college).

### 6. Scales & Modes / Theory
Staff & clef literacy → key signatures → scale ID (major/minor) → modes → interval spelling → figured bass. Silent theory drills MusicTheory.net-style.

**Two optional additions (defer to v2 or later):**
7. Score Reading (C-clefs, advanced notation)
8. Repertoire Mode (sight-read real pieces from GleeWorld's music library)

## Level progression (K → College)

16 levels compressed into 4 tracks that map to school stage. Each level = ~4-8 weeks of practice; graduation = 80% mastery across all skills in that unit.

| # | Name | Age | Focus | Grad criterion |
|---|---|---|---|---|
| 1 | Beat & Voice | K-1 | Steady beat, high/low, echo 3-note | 8/10 echo accuracy |
| 2 | Pentatonic Play | 2-3 | s-m-l-d-r, ta/ti-ti, quarter+eighth reading | Sight-sing 4-bar pentatonic |
| 3 | Diatonic Doorway | 3-4 | Full major scale, fa/ti, half notes/rests | Sight-sing stepwise 8-bar C major |
| 4 | Staff & Key | 4-5 | Treble/bass literacy, C/G/F key sigs, simple meter | Name any note; clap 8-bar rhythm |
| 5 | Intervals I | 5-6 | 2nds/3rds/P5/P8 sung + heard; natural minor | 85% interval ID (5 types, asc) |
| 6 | Rhythm Depth | 6-7 | Dotted rhythms, 6/8, basic syncopation, 2-bar rhythm dictation | Dictate 4-bar rhythm |
| 7 | Chord Colors | 7-8 | M/m/dim/aug triad ID; triad spelling; 2-bar melodic dictation | 85% triad ID |
| 8 | Key Fluency | HS-9 | All 15 key sigs, all intervals + inversions | Name any key sig in <3s |
| 9 | Cadences & Function | HS-10 | I/IV/V/vi; PAC/IAC/HC/Deceptive; 4-chord harmonic dictation | 4-chord dictation |
| 10 | Chromatic Sight-Sing | HS-11 | di/ri/fi/si/li; tonicization | Sight-sing 8-bar chromatic |
| 11 | Seventh Chords | HS-AP | Mm7/mm7/dim7/ø7/MM7; figured bass 6/5/4/3 | AP-level chord ID 85% |
| 12 | AP Aural Prep | AP | Full harmonic + melodic dictation w/modulation; timed sight-singing | Mock AP aural 4+ |
| 13 | AP Written Prep | AP | SATB voice-leading, Roman numerals, part-writing | Mock AP written 4+ |
| 14 | Modes & Modal Ear | Col-1 | Church modes ID + sing; C-clef reading | Modal dictation |
| 15 | Modulation & Chromaticism | Col-2 | Secondary dominants, borrowed chords, distant modulation | 16-bar modulating dictation |
| 16 | Post-Tonal Literacy | Col-3-4 | Atonal sight-sing, mixed meter, set-class ID | Berkowitz/Ottman advanced examples |

**Adaptive placement test on first login** — a 10-min diagnostic lands the student at the right level. Prevents 8th graders from grinding through Level 1.

## Rhythm Machine (new)

Deserves its own component because clap detection is a distinct engineering problem from pitch detection.

**Input:** device mic via `getUserMedia` + Web Audio `AnalyserNode`. Onset detection = RMS + spectral flux. Peaks above adaptive noise floor = onsets. Compare onset timeline to expected pattern; score per-note timing.

**Timing tolerance:** ±30ms tight (assessment) / ±50ms loose (practice) — but expressed as **% of beat**, not absolute ms, so slow tempos aren't punished. Real musical time varies; ±10ms is too tight and will punish good musicians.

**Alternate input methods:**
- Screen tap (accessibility / no-mic devices)
- MIDI drum pad (serious HS/college)

**Never mic-detect body percussion (camera).** Cool demo, unreliable in classrooms.

**Syllable toggle:** Takadimi (default) · Kodály (K-2 required) · 1-e-and-a (band tradition). Teacher-configurable per class.

**Common rhythm-app mistakes to avoid:**
- Quantizing too tight (±10ms punishes good musicians)
- Scoring against click, not phrase (locked-to-click ≠ musical)
- Skipping subdivision practice
- Ignoring rest accuracy
- Treating compound meter as level 12 (it appears at level 6)

## Real classroom flow (what teachers actually need)

**A 45-min middle-school choir class, Tuesday:**
- 0-5: attendance
- 5-15: sectional sight-read (paper, off-app)
- 15-30: rehearsal
- **30-40: musicianship — app window**
- 40-45: exit

That's a **10-minute session budget on shared Chromebooks with Clever/Google SSO**. If login takes 3 minutes, the tool is dead. SSO or class-code entry is non-negotiable.

**The 10-min session shape:**
1. 0:00 — Warm-up (60s): fixed drone + 4 rapid interval calls, ungraded.
2. 1:00 — Skill drill (5 min): assigned or continuing node. Karaoke scroll + mic feedback.
3. 6:00 — Micro-assessment (2 min): 3 problems on the same skill, scored. Mastery ring ticks.
4. 8:00 — Bonus round (1 min): adjacent-domain quick quiz (rhythm clap-back or "which chord did you hear").
5. 9:00 — Session summary: mastery ring animation, streak dot, "Next up" tease.

## Teacher / classroom surface (4 screens)

1. **Class roster heatmap** — rows = students, columns = last 14 days, cell = minutes practiced + mastery gained. Red cells = "no practice in 4 days." One-click into any student.
2. **Assign flow** — pick a node (or multi-select) from the same tree students see → "Assign to Period 3, due Fri." One dialog, three fields. No separate assignment builder — the tree IS the curriculum.
3. **Student detail** — that student's tree with mastery rings, recent sessions, best/worst skills.
4. **Struggling-students digest** — weekly card: "3 students haven't practiced this week; 2 students failed the same m6 drill 5+ times — consider reteaching."

**Teacher dashboard TOP 3 priorities (ranked):**
1. Alerts (someone hasn't practiced in 7+ days) — only actionable item
2. Which skills is the whole class weak on — drives next mini-lesson
3. Who practiced this week — participation credit / recognition

Assign to class in <90 seconds. Grading UI is one column of green/yellow/red per student (Sight Reading Factory's winning pattern). Push notification to student AND parent on assignment.

## Assessment mechanics

Kids trust the tool because teachers do. Teachers trust the tool because:
- **Pitch detection accurate to ±20¢** for grading. Below that, teachers override every score.
- **Rhythm timing tolerance as % of beat**, not absolute ms.
- **Waveform / piano-roll of student's take next to the target** — teachers trust what they can eyeball. This is the #1 SmartMusic feature that made teachers accept computer grading.
- **Teacher override in one click.** If the algorithm calls a passing note flat and the teacher heard it right, override → student sees corrected grade.
- **Published "how we score" doc.** Teachers need to defend grades to parents.
- **Two-tempo rule.** Every drill has a "learn tempo" (slow, click, feedback) and a "perform tempo" (up-to-speed, no click, one shot). Both are recorded.

## What GleeWorld already has that helps

- **Existing pitch-detection lib** (`src/lib/sightReading/useMicPitch.ts` — AudioWorklet + pitch tracker).
- **Existing sight-singing generator** (`src/lib/sightReading/generate.ts` — reusable for melody generation).
- **Repertoire catalog** (Phase 1 shipped) — real octavos to sight-read from, killing the "synthetic exercises get stale" problem in one move.
- **Multi-tenant classroom infrastructure** — roster, roles, tenants.
- **iOS Capacitor wrapper** — mic reliability + native integration already in production.
- **The new Pitch Match tab + Sets** — becomes the Pitch & Intervals domain's first content.

## The MVP filter

Every proposed feature passes this test: **"Would a middle-school choir director assign this Tuesday?"** If not, defer.

## MVP scope decomposition (3 phases)

Each ships as its own PR / spec / plan.

### Phase 1 — Foundation (~2 weeks)
- **Nav rebrand**: `/dashboard/sight-reading` → `/dashboard/reading-music` (permanent redirect from old path).
- **Skill-tree shell**: 6 domain columns with mastery-ring nodes derived from existing attempt tables.
- **Landing page**: "Continue" card + Daily Warm-up + Assignments-pinned strip.
- **Placement diagnostic**: 10-min test that assigns a starting level 1-16.
- **Migrate existing surfaces into domain columns**: sight-singing (`SingFlow`) → Sight-Singing column; PitchMatch + PitchSetPlayer → Pitch & Intervals; existing Progress → per-domain mastery view.
- **Free-play stays** as a lightweight sandbox drawer.
- **Nav config**: sub-nav under Reading Music mirrors the 6 domains.

**Ships as:** unified rebranded surface with existing skills reorganized into the tree. No new skills yet.

### Phase 2 — Rhythm Machine + Assessment mode (~2 weeks)
- **Rhythm Machine**: onset detection (AnalyserNode + spectral flux); Takadimi/Kodály/counting toggle; simple → compound → syncopation levels.
- **Assessment mode**: one-shot recorded attempt vs. practice-mode unlimited best-kept, one flag on any drill.
- **Waveform + piano-roll comparison** on results screen (what student did vs. target).
- **Teacher override**: one-click grade correction on any assessment attempt.
- **Persist**: new `gw_reading_music_attempts` table (supersedes / consolidates the 3 existing per-tool attempt tables).

**Ships as:** first classroom-defensible assessment tool with clap+sing scoring.

### Phase 3 — Teacher surface + real repertoire (~2 weeks)
- **Class roster heatmap** at `/dashboard/reading-music/class`.
- **Assign flow**: pick any node → assign to class + due date. Push notification to student + parent.
- **Struggling-students weekly digest**: email + dashboard card.
- **Repertoire mode**: sight-read from GleeWorld's existing octavo library (Phase 1 Repertoire integration). UIL/FVA/GMEA preset difficulty tiers.

**Ships as:** the classroom-teacher product Kevin can pitch to choral directors — assignments, grades, catch-struggling-kids, real music not just drills.

### Deferred (v2 or later, per the "MVP filter")
- SATB voice-leading auto-grader (MusicTheory.net does it free)
- Body-percussion camera detection
- Jazz improv over changes
- Post-tonal set-class training (<2% of users)
- Instrument fingering trainers (Yousician's turf)
- Native Windows/Mac apps
- Adaptive AI difficulty (ship rule-based first)

## Explicit don'ts

- **Don't grade the first note the mic hears** (mic latency + throat-clearing = false fail). 3-2-1 countdown + 500ms grace.
- **Don't gate audio permission without a warm-up screen** — students bounce.
- **Don't punish streak loss with a paywall.** GleeWorld is a school product.
- **Don't build a "practice log" the student fills out** — the tree state IS the log.
- **Don't do achievements based on time-in-app.** Reward accuracy and skill acquisition.
- **Don't put theory quizzes in a separate tab from ear training** — they're the same skill.
- **Don't show cents-off numbers during phrase singing** — no one sings a phrase at 0¢; you'll teach distrust of the tool.

## Nav taxonomy (final)

Sidebar → **Music** section → **Reading Music** (rename of existing Sight Reading entry; icon: `BookOpen` or `Music3`).

Sub-nav (tabs within the page):
1. **Continue** — landing with Continue-card + Daily Warm-up + Assignments
2. **Pitch & Intervals**
3. **Rhythm** *(the Rhythm Machine)*
4. **Sight-Singing**
5. **Dictation**
6. **Harmony & Chords**
7. **Scales & Theory**
8. **Progress** — per-domain mastery view
9. **Class** *(admin/teacher only)*

Existing `/dashboard/sight-reading` becomes a permanent 301 to `/dashboard/reading-music`.

## Open questions for Kevin

1. **Solfège system**: default to **movable-do with la-based minor** (Kodály/US standard) — confirm? Some conservatories use fixed-do.
2. **Placement diagnostic depth**: 10-min or a lighter 3-min? Longer is more accurate but scarier for first-time users.
3. **Class dashboard**: launch classroom features to super-admin only for beta, or open to every tenant admin from day one?
4. **Rhythm assessment**: which state adjudication rubric to hard-code first — UIL (Texas), FVA (Florida), GMEA (Georgia)? Pick one; add others per user request.
5. **Do we want a "voice change" mode** for middle-school boys where the whole range shifts week-to-week and pitch matching is de-prioritized? (Pedagogy expert flagged this as a common tool-failure point.)
6. **iOS build**: piggy-back on existing GleeWorld iOS Capacitor as PWA, per plan — confirm no separate app.

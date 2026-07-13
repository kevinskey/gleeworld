# Assistant Course Builder — Design

**Date:** 2026-07-13
**Status:** Approved by Kevin (conversation, 2026-07-13)
**Depends on:** GleeWorld Assistant Phase 1 (PR #157) + Phase 2 (PR #160); Canvas Academy (`gw_courses` system)

## What

The GleeWorld Assistant interviews a teacher conversationally, then creates a
complete, ready-to-review **draft course** in Canvas Academy: modules with
descriptions, assignments with authored prompts, due dates and points, a
grading rubric, class sessions expanded from the meeting schedule, and a
repertoire playlist shell. The teacher reviews and edits the draft in the
real Canvas Academy UI, then publishes. Enrollments apply at publish, never
at draft.

Target system: **`gw_courses` + satellites** (`gw_course_modules`,
`gw_course_assignments`, `gw_course_rubrics`, `gw_course_class_sessions`,
`gw_course_playlists`, `gw_course_enrollments`). NOT the template-course
store (`gw_academy_*`) — that is a separate, sellable-content system.

## Decisions (Kevin's)

- Build into Canvas Academy (`gw_courses`), the teacher-facing system.
- **Full course content**: the model authors module descriptions, assignment
  prompts, and rubric criteria — not just structure stubs. No auto-generated
  test questions in v1.
- **Draft + review page** UX: the confirm card in the thread only gates
  "Create the draft?"; real review happens on the course page with full
  editing, ending in an explicit Publish action.
- Extras in scope: class sessions from the meeting schedule, enrollments
  (publish-time), playlist shell.

## Architecture (Approach A — one-shot RPC behind a single tool)

One new confirm-gated tool, one transactional write path.

```
teacher ⇄ assistant interview (prompt-guided, no new UI)
            │  assembles CourseSpec JSON across turns
            ▼
tool: create_course_draft(spec)         [admin/director-gated, confirm card]
            │  spec validation (shape + size caps) in the edge fn executor
            ▼
RPC: assistant_create_course(spec jsonb) [SECURITY INVOKER — RLS applies]
            │  single transaction: course(status='draft') + modules +
            │  assignments + rubric + class sessions + playlist shell +
            │  pending-enrollment list
            ▼
returns {course_id, counts} → executor .select()-checks → assistant
opens /academy/courses/:id via open_page → teacher reviews/edits → Publish
```

Rejected alternatives:
- **Incremental tools** (`add_module`, `add_assignment`, …): blows the
  ~6-tool-iteration cap on real courses and leaves half-courses on
  mid-sequence failure.
- **Dedicated wizard page**: reliable but abandons the conversational
  interview; separate surface, more UI.

## Components

### 1. Interview (prompt only — `supabase/functions/assistant-chat/prompt.ts`)

A `course_builder` section appended for admin/director roles only. It
instructs the model to gather, before ever calling the tool:

- subject and level; course title + code suggestion
- term, start and end dates; meeting days/times; named breaks
- learning goals (used to shape modules)
- grading policy → rubric categories and weights
- assignments cadence (e.g. weekly reflection + 2 performances)
- repertoire/materials to seed the playlist
- who's in the class (names/section) → pending enrollments

Batches of 2–3 questions per turn; before generating, restate a
one-paragraph summary and get a verbal yes. Then emit ONE
`create_course_draft` call with the full spec.

### 2. Tool + executor (`toolCatalog.ts`, `executors.ts`)

- Catalog entry `create_course_draft` with a JSON-schema'd `spec` parameter;
  joins the admin-gated set (same server-side role filter as `send_sms`).
  `confirm: true` — the thread card reads "Create draft course
  ‘<title>’ — N modules, M assignments, K sessions?"
- Executor validates before the RPC:
  - shape: title, dates, ≥1 module; every assignment inside a module
  - caps: ≤16 modules, ≤8 assignments/module, ≤2,000 chars per prompt
    text, ≤120 class sessions, spec JSON ≤64 KB
  - date sanity: end after start; sessions only within term bounds
- On cap violation the executor returns a structured error the model can
  act on ("spec too large — split into two smaller courses or trim
  module descriptions"), never a silent truncation.
- RPC result is `.select()`-checked; zero-row/failure surfaces as an
  in-thread error (demo-tenant silent-write rule).

### 3. Database (one migration)

- `gw_courses.status text not null default 'published'
  check (status in ('draft','published'))` — default keeps every existing
  row and code path unchanged; `is_active` untouched.
- `gw_courses.pending_enrollments jsonb` — the interview's roster
  (user ids resolved via existing `find_user` where possible, else raw
  names for the teacher to resolve at publish).
- RLS: one added predicate — students/members cannot select courses with
  `status='draft'` (instructors/admins unaffected).
- Function `assistant_create_course(spec jsonb) returns jsonb`,
  SECURITY INVOKER, one transaction:
  1. insert `gw_courses` (status='draft', `created_by`/`instructor_id`
     from `auth.uid()`, meeting_patterns from spec)
  2. insert modules (ordered), assignments (due dates, points, prompts),
     rubric rows
  3. expand meeting patterns × [start_date, end_date] − breaks into
     `gw_course_class_sessions`
  4. insert one `gw_course_playlists` shell. Repertoire resolution happens
     during the interview, not in the RPC: the model calls the existing
     `search_music` tool to resolve titles the teacher names, and the spec
     carries `{library_item_id}` for matches or `{title}` for the rest;
     the RPC inserts media rows only for resolved ids and stores raw
     titles in the playlist description for the teacher
  5. return `{course_id, module_count, assignment_count, session_count}`
- Session expansion lives in SQL (a generate_series over the date range
  filtered by weekday) — deterministic and testable in a migration test,
  mirroring `supabase/migrations/tests/` conventions.

### 4. Canvas Academy UI (small)

- Draft banner on course pages where `status='draft'`: "Draft — review and
  publish. Students can't see this course yet." with a **Publish** button
  (instructor/admin only).
- Publish flips `status='published'` and applies `pending_enrollments` →
  `gw_course_enrollments` (resolving any still-raw names via the existing
  people picker; unresolved names stay listed on the banner until handled
  or dismissed).
- Course lists (teacher-facing) show a small "Draft" chip; student-facing
  queries already exclude drafts via RLS.

## Error handling

- RPC failure → transaction rolls back; assistant reports the reason
  in-thread; no partial course ever exists.
- Model emits an invalid spec → executor's structured validation error goes
  back into the tool loop; the model corrects or asks the teacher.
- Teacher abandons a draft → it sits invisible to students, visible with a
  Draft chip in the teacher's own course list. No auto-delete or nag in v1;
  deleting a draft uses the existing course-delete path.

## Testing

- **Unit (vitest, edge fn):** spec validation (caps, shapes, dates), role
  gating (member/student never sees the tool), executor error mapping.
- **Migration test (SQL):** session expansion (patterns × range − breaks,
  weekday math across DST), draft RLS (student can't select), publish flip.
- **Integration (droplet):** RPC called with a real JWT against a scratch
  tenant; `.select()` verification.
- **Manual:** full interview → draft → edit → publish on the demo tenant
  (writes there fail silently — the `.select()` checks are what proves it).

## Out of scope (v1)

- Auto-generated tests/quizzes (`gw_course_tests`) — content risk; later.
- Editing an existing course via the assistant ("add a module to…") — the
  incremental-tool problem; later, as targeted single tools.
- Template-store authoring (`gw_academy_*`).
- Streaming replies during generation (Phase 3 polish item).

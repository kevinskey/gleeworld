# Glee Academy — AI Course Form (Phase 1) — Design

**Date:** 2026-07-14
**Status:** Approved by Kevin (conversation, 2026-07-14 — chose form-first staging, option A "straight to draft")
**Depends on:** Assistant Course Builder (DEPLOYED 2026-07-14) — reuses `assistant_create_course(spec jsonb)` RPC, the `courseSpec.ts` validator, and the draft/publish flow on CourseShell (`/academy/c/:code`).

## What

A form-based way to create a course in Glee Academy: a teacher fills in the basics, hits **Generate**, and the AI authors a complete **draft** course (modules with descriptions, assignments with prompts, a grading rubric, and class sessions expanded from the meeting schedule) using the engine shipped 2026-07-14. On success the teacher lands directly on the draft course page (CourseShell) to review, edit, and Publish — **no conversational interview**.

This is Phase 1 of a larger staged effort (see the full Academy vision). Later phases: nest assignments/quizzes/discussions under modules; bring Syllabus/Outcomes/Home/Calendar onto CourseShell; a real class Gradebook. Those are OUT of scope here.

## Why a form (not the assistant interview)

The conversational interview (assistant `create_course_draft` tool) shipped 2026-07-14 but Kevin prefers a form: structured inputs (dates, meeting days, grading weights) are clearer to fill in than to dictate to a chatbot. The backend is identical either way — only the input surface changes.

## Decisions (Kevin's)

- **Form, not chat**, for gathering the inputs.
- **Option A**: after Generate, go straight to the created draft course (CourseShell already has full editing + the Publish gate). No separate outline-preview/approve step.
- **AI does the heavy authoring**: the form collects basics; the model expands them into full module descriptions and authored assignment prompts + rubric.

## Architecture

One new edge function that turns form basics into a validated CourseSpec and creates the draft in one call, reusing the deployed RPC.

```
teacher fills AiCourseForm (React)
        │  { title, subject, level, term_start, term_end,
        │    meeting_patterns[], learning_goals, grading_approach,
        │    repertoire[], roster[] }
        ▼
POST /functions/v1/generate-course-draft   (caller's JWT)
        │  1. build a generation prompt from the form inputs
        │  2. call the model (DeepSeek, shared provider) → CourseSpec JSON
        │  3. validateCourseSpec(spec)  (shared _shared/courseSpec.ts)
        │       invalid → feed the error back, retry ONCE, else 422
        │  4. call assistant_create_course(spec) under the caller's JWT (RLS applies)
        ▼
returns { course_id, course_code, module_count, assignment_count, session_count }
        │
        ▼
client navigates to /academy/c/<course_code>  → draft banner + Publish (already shipped)
```

### Why a new edge function (not the assistant path)

`assistant_create_course` takes a COMPLETE spec (the interview authored it turn-by-turn). A form only supplies basics, so we need a one-shot LLM step to author the full spec from those basics before calling the RPC. `generate-course-draft` is that step. It is admin/director-gated the same way (role derived from the JWT via `_shared/auth.ts`).

## Components

### 1. Shared validator (refactor)
- Move `supabase/functions/assistant-chat/courseSpec.ts` → `supabase/functions/_shared/courseSpec.ts`; update `assistant-chat/index.ts` import to `../_shared/courseSpec.ts`. Both functions now share ONE validator (DRY). No behavior change; existing `courseSpec.test.ts` moves with it (path update only).

### 2. Edge function `generate-course-draft` (`supabase/functions/generate-course-draft/index.ts`)
- Authenticates the caller (`_shared/auth.ts`); 403 for non-admin/director.
- `prompt.ts`: builds a generation prompt instructing the model to return ONE CourseSpec JSON matching the shared shape — full module descriptions and authored assignment prompts, rubric criteria from the grading approach, class-session meeting_patterns straight from the form, repertoire/roster passed through. Reuses `provider.ts` model-call pattern from assistant-chat (extract shared bits to `_shared/provider.ts` if clean; otherwise duplicate minimally).
- Validates with the shared validator; on failure re-prompts once with the structured error, then returns `422 { error }`.
- Calls `assistant_create_course` via a supabase client built with the caller's Authorization header (RLS applies — same trust model as the client path). `.select()`-checks the result (demo-tenant silent-write rule).
- Returns the RPC summary JSON.

### 3. Client form (`src/components/academy/AiCourseForm.tsx`)
- Fields: `title` (req), `subject`, `level`, `term_start`/`term_end` (date inputs), `meeting_patterns` (repeatable rows: weekday select + start/end time + optional room), `learning_goals` (textarea), `grading_approach` (textarea), `repertoire` (optional; a MemberSearch-style search over the music library, storing resolved ids + free titles), `roster` (optional; existing people-picker → user ids + free names). Light-theme tokens; "students" not "singers".
- Submit → calls the edge fn via `supabase.functions.invoke('generate-course-draft', { body })`; shows a "Generating your course…" state; on success `navigate('/academy/c/' + course_code)`; on error shows the message inline (never a silent success).
- Client-side guardrails mirror the validator's cheap checks (title present, end after start, ≥1 meeting pattern) for instant feedback.

### 4. Entry point (`src/pages/academy/NewCoursePage.tsx`)
- Add a **"Create with AI"** choice alongside the existing manual create (which stays untouched — it inserts a bare course row). Selecting it renders `AiCourseForm`. Route stays `/academy/new`; a `?mode=ai` param (or a top toggle) switches the surface. The manual path is a deliberate fallback for someone who wants an empty shell.

## Data flow / reuse
- No new tables. Writes go through `assistant_create_course` exactly as the assistant path does (gw_courses draft + modules + gw_assignments + rubric/criteria + class sessions + playlist shell + pending roster).
- Course lands as `status='draft'`; students can't see it (RLS shipped 2026-07-14); teacher publishes from CourseShell.

## Error handling
- Model returns invalid/oversized spec → validator rejects → one re-prompt with the error → else `422` with an actionable message the form shows ("Couldn't generate a valid course from those inputs — try simplifying the goals or shortening the term").
- RPC failure / zero rows → surfaced in the form; no partial course (RPC is one transaction).
- Non-admin caller → 403; the form is only offered to admin/director roles client-side too.
- Generation latency (several seconds) → explicit loading state; the invoke has a generous timeout.

## Testing
- **Unit (vitest):** shared `courseSpec` validator (moves, still green); `generate-course-draft` prompt builder (form → prompt contains the inputs); role gating (member → 403); spec-validation retry mapping (mock model returns bad-then-good). `AiCourseForm` render + client-side validation + success-navigates / error-shows (mock invoke).
- **Integration (droplet, post-deploy):** real admin JWT → generate-course-draft with sample form inputs → draft course created → `/academy/c/:code` loads → publish. Demo tenant proves the `.select()` checks.
- **Manual:** fill the form on the demo tenant, generate, review the draft, edit a module, publish.

## Out of scope (Phase 1)
- Outline preview/approve-before-create step (Kevin chose A).
- Module-nesting of assignments/quizzes/discussions; Syllabus/Outcomes/Home/Calendar tabs; class Gradebook (later phases).
- Editing an existing course via the form; regenerate-in-place.
- Auto-generated quiz questions (content risk; deferred, as with the assistant path).

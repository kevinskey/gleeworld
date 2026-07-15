# AI Quiz Generation for the Course Builder — Design

**Date:** 2026-07-14
**Status:** Approved by Kevin (conversation, 2026-07-14 — chose option A: multiple-choice + true/false only, quizzes on suited modules, unpublished for review)
**Depends on:** AI Course Form (PR #175, deployed) — reuses `generate-course-draft` + `assistant_create_course` RPC + `courseSpec` validator. Reuses the EXISTING quiz engine (`gw_course_tests`, `gw_course_test_questions`, `gw_course_test_attempts`, `gw_course_test_answers`, `grade_test_attempt()` RPC; `QuizQuestionsPage`/`QuizTakingPage`/`QuizAttemptsPage`).

## What

The AI course builder gains the ability to draft **real quizzes** (not assignments) into GleeWorld's existing quiz engine. When it generates a course, for the modules that suit a quiz it authors a short quiz (multiple-choice + true/false questions with correct answers), created **unpublished**. The teacher opens it in the course's **Quizzes tab → "Build questions"** (the editor that already exists), reviews/edits/approves, then publishes; students take it and it auto-grades — all existing machinery. **No new student UI, no new tables.**

## Decisions (Kevin's)

- **Question types: multiple_choice + true_false ONLY** (auto-grade cleanly; short_answer/multi_select excluded — the teacher can still add those by hand in the editor).
- Quizzes on **modules that suit one, not every module**; short (≈3–5 questions).
- **Always `is_published = false`** — nothing reaches students until the teacher reviews it.

## Storage format (must match the existing engine exactly)

`gw_course_test_questions` (from `20260615000000_quiz_questions.sql`): `question_type`, `prompt`, `options jsonb`, `correct_answer jsonb`, `explanation`, `points`, `position`, `test_id`, `tenant_id`.
- **multiple_choice:** `options = [{id, text}]` (ids `'a','b','c',…`); `correct_answer = '<id>'` (a single option id string). Grader: `answer = correct_answer`.
- **true_false:** `options = null`; `correct_answer = true|false` (jsonb boolean). Grader: `answer = correct_answer`.
`gw_course_tests` is course-scoped (no `module_id`), so quizzes attach to the COURSE; the module/topic is reflected in the quiz title.

## Architecture

Extend the spec → validator → RPC chain; the form and edge function are unchanged except sanitizing new text.

```
generate-course-draft (unchanged flow)
  model authors CourseSpec  → now may include a top-level `quizzes` array
  validateCourseSpec (shared) → validates quizzes + questions (NEW)
  sanitizeSpecText → also strips tags from quiz prompt/choices (NEW)
  assistant_create_course(spec) RPC → ALSO inserts gw_course_tests + gw_course_test_questions (NEW), is_published=false
  → draft course; teacher reviews quizzes in the existing Quizzes tab, publishes
```

## Components

### 1. Shared validator (`supabase/functions/_shared/courseSpec.ts`)
Add an OPTIONAL top-level `quizzes` to `CourseSpec`:
```ts
quizzes?: Array<{
  title: string;
  description?: string;          // shown as the quiz's instructions
  module_week?: number;          // which module/week it covers (for the title/order; not stored as FK)
  questions: Array<
    | { type: 'multiple_choice'; prompt: string; choices: string[]; correct_index: number; points?: number; explanation?: string }
    | { type: 'true_false'; prompt: string; correct_answer: boolean; points?: number; explanation?: string }
  >;
}>;
```
Validation rules (extend `validateCourseSpec`): quizzes optional; ≤6 quizzes; each needs a title + ≥1 question; ≤8 questions/quiz; each question `type` ∈ {multiple_choice, true_false}; MC needs 2–5 `choices` (non-empty strings) and `correct_index` in range; TF needs a boolean `correct_answer`; `prompt` required, ≤2000 chars; points a non-negative number (default 10). Reject unknown types (keeps short_answer/multi_select out per the decision). Counts folded into the existing 64 KB / text-length guards.

### 2. Prompt (`supabase/functions/generate-course-draft/prompt.ts`)
Add a rule instructing the model: for modules that suit assessment, draft a short quiz (3–5 questions) of multiple-choice and/or true/false ONLY, each with the correct answer marked and a one-line explanation; keep questions factual and unambiguous; at most 6 quizzes total; put the module/topic in the quiz title. Emit them in the top-level `quizzes` array using the shape above. Reminder that quizzes are drafts the teacher will review.

### 3. RPC (`assistant_create_course`) — one new migration (CREATE OR REPLACE)
After modules/assignments/rubric/sessions, if `spec->'quizzes'` is a non-empty array, for each quiz:
- INSERT `gw_course_tests` (`course_id`, `title`, `description`=quiz description, `test_type='quiz'`, `total_points`=sum of question points, `is_published=false`, `created_by=auth.uid()`) RETURNING id.
- For each question (ordered), INSERT `gw_course_test_questions`:
  - `multiple_choice`: build `options` = `jsonb_agg({id: chr(97+idx), text: choice})` over `choices`; `correct_answer = to_jsonb(chr(97 + correct_index))`.
  - `true_false`: `options = null`; `correct_answer = to_jsonb(correct_answer boolean)`.
  - `prompt`, `explanation`, `points` (default 10), `position` = 0-based index, `test_id`.
- `tenant_id` set by the existing BEFORE INSERT trigger / column default (verify against prod like the assignment path).
Return `quiz_count` alongside the existing counts. SECURITY INVOKER unchanged (RLS: quiz insert must satisfy `gw_course_test_questions`/`gw_course_tests` insert policies — verify an instructor/editor passes them; if the tests-table insert policy is admin-flag-only, add an `is_course_editor()`-based policy in the same migration, mirroring the assignments fix).

### 4. Sanitize (`generate-course-draft/index.ts`)
Extend `sanitizeSpecText` to strip tags from each quiz `title`, `description`, question `prompt`, `choices[]`, and `explanation` before the RPC.

### 5. Client (`generateCourse.ts` message)
Include quiz count in the success message when present: "… N modules, M assignments, K class sessions, Q quizzes." (Minor.)

## Data flow / reuse
No new tables, no new student UI. Review/edit = existing `QuizQuestionsPage` (`/academy/c/:code/test/:id/questions`); taking = `QuizTakingPage`; grading = `grade_test_attempt()`. Quizzes are course-scoped and unpublished until the teacher publishes.

## Error handling
- Invalid quiz/question shape → validator rejects → the generate fn's existing one-retry loop asks the model to correct → else 422 with an actionable message.
- RPC failure → whole transaction rolls back (atomic; no partial course/quiz).
- Empty/malformed correct answers caught by the validator (MC correct_index in range; TF boolean).

## Testing
- **Unit (vitest):** validator accepts a valid quizzes block and rejects: unknown type, MC out-of-range correct_index, MC with <2 choices, TF non-boolean, >6 quizzes, >8 questions; prompt builder mentions quizzes + the two allowed types.
- **Migration test (SQL, scratch DB):** call `assistant_create_course` with a spec containing one MC + one TF question; assert a `gw_course_tests` row (is_published=false) + two `gw_course_test_questions` with correct `options`/`correct_answer` shapes; assert `grade_test_attempt` scores a correct MC/TF answer against them (closes the loop that the generated format actually grades).
- **Manual (demo tenant):** generate a course with quizzes → open Quizzes tab → Build questions shows the drafted questions → publish → take → auto-grades.

## Out of scope
- short_answer / multi_select generation (teacher adds by hand).
- Per-module FK linkage of quizzes (schema has none; title carries the topic).
- Auto-publishing quizzes (always manual review first).
- Regenerating/editing quizzes via the AI after creation.

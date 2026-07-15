# AI Quiz Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The AI course builder drafts real quizzes (multiple-choice + true/false) with correct answers into the existing quiz engine, created unpublished, reviewed via the existing Quizzes editor before publishing.

**Architecture:** Extend the CourseSpec (shared validator) with an optional top-level `quizzes` array of MC/TF questions; extend the `generate-course-draft` prompt to author them; extend the deployed `assistant_create_course` RPC (one new migration, CREATE OR REPLACE) to insert `gw_course_tests` (is_published=false) + `gw_course_test_questions` in the engine's exact storage format; sanitize quiz text before the RPC. No new tables, no new student UI — review/take/grade reuse `QuizQuestionsPage`/`QuizTakingPage`/`grade_test_attempt()`.

**Tech Stack:** Deno/TS Supabase edge fn, DeepSeek json_object, plpgsql RPC + migration, vitest, SQL migration test via psql on a scratch DB.

## Global Constraints

- Question types are **multiple_choice and true_false ONLY** — reject any other type in the validator.
- Storage format is fixed by the existing engine: MC `options = [{id,text}]` (ids 'a','b','c',…), `correct_answer = '<id>'` (single option id string); true_false `options = null`, `correct_answer = true|false` (jsonb boolean). Grader `grade_test_attempt` compares `answer = correct_answer`.
- Quizzes created `is_published = false` ALWAYS.
- Reuse the DEPLOYED `assistant_create_course` RPC + shared `courseSpec` validator — extend, don't fork.
- Tenant-neutral copy; "students" not "singers".
- Every Supabase write `.select()`-checked (demo silent-write rule); RPC is one atomic transaction.
- New RLS policies accept both `super_admin` and `super-admin` spellings; use `is_course_editor()` (already deployed) for editor gating.
- Deno relative imports need `.ts`. vite build is the typecheck gate. `git add -A` FORBIDDEN. vitest tests beside source.
- Branch `academy-ai-quizzes`; verify with `git branch --show-current` before every commit.
- Migration tests: psql on a scratch DB, never prod: `/opt/homebrew/opt/postgresql@16/bin/psql -d <scratch> -v ON_ERROR_STOP=1 -f <file>`.

---

### Task 1: Extend the shared validator with `quizzes`

**Files:**
- Modify: `supabase/functions/_shared/courseSpec.ts`
- Test: `supabase/functions/_shared/__tests__/courseSpec.test.ts`

**Interfaces:**
- Produces: `CourseSpec.quizzes?` (optional) and validation for it. Task 3 (RPC) reads `spec->'quizzes'`; Task 2 (prompt) describes this shape.

- [ ] **Step 1: Write the failing tests**

Append to `supabase/functions/_shared/__tests__/courseSpec.test.ts` inside the existing `describe`, and add a `quizzes` key to the `valid()` helper's returned object (so the happy-path test still passes with quizzes present):

```ts
  it('accepts a valid quizzes block (MC + true/false)', () => {
    const r = validateCourseSpec({ ...valid(), quizzes: [{
      title: 'Quiz 1: Spirituals',
      questions: [
        { type: 'multiple_choice', prompt: 'Who arranged "My Soul\'s Been Anchored"?', choices: ['Moses Hogan', 'Hall Johnson', 'Jester Hairston'], correct_index: 0, points: 5 },
        { type: 'true_false', prompt: 'Spirituals originated as oral tradition.', correct_answer: true, points: 5 },
      ],
    }] });
    expect(r.ok).toBe(true);
  });

  it('rejects an unknown question type (short_answer/multi_select excluded)', () => {
    const bad = { ...valid(), quizzes: [{ title: 'Q', questions: [{ type: 'short_answer', prompt: 'x', correct_answer: ['y'] }] }] };
    expect(validateCourseSpec(bad).ok).toBe(false);
  });

  it('rejects MC with correct_index out of range or <2 choices', () => {
    const oob = { ...valid(), quizzes: [{ title: 'Q', questions: [{ type: 'multiple_choice', prompt: 'p', choices: ['a', 'b'], correct_index: 5 }] }] };
    expect(validateCourseSpec(oob).ok).toBe(false);
    const few = { ...valid(), quizzes: [{ title: 'Q', questions: [{ type: 'multiple_choice', prompt: 'p', choices: ['a'], correct_index: 0 }] }] };
    expect(validateCourseSpec(few).ok).toBe(false);
  });

  it('rejects true_false without a boolean correct_answer', () => {
    const bad = { ...valid(), quizzes: [{ title: 'Q', questions: [{ type: 'true_false', prompt: 'p', correct_answer: 'yes' }] }] };
    expect(validateCourseSpec(bad).ok).toBe(false);
  });

  it('enforces quiz caps (<=6 quizzes, <=8 questions each, quiz needs a title + >=1 question)', () => {
    const q = { title: 'Q', questions: [{ type: 'true_false', prompt: 'p', correct_answer: true }] };
    expect(validateCourseSpec({ ...valid(), quizzes: Array.from({ length: 7 }, () => ({ ...q })) }).ok).toBe(false);
    const manyQ = { title: 'Q', questions: Array.from({ length: 9 }, () => ({ type: 'true_false', prompt: 'p', correct_answer: true })) };
    expect(validateCourseSpec({ ...valid(), quizzes: [manyQ] }).ok).toBe(false);
    expect(validateCourseSpec({ ...valid(), quizzes: [{ title: '', questions: [] }] }).ok).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run supabase/functions/_shared/__tests__/courseSpec.test.ts`
Expected: FAIL (quizzes not validated / valid() lacks quizzes — the new tests fail).

- [ ] **Step 3: Implement**

In `supabase/functions/_shared/courseSpec.ts`:

1. Add caps near the other consts:
```ts
const MAX_QUIZZES = 6;
const MAX_QUESTIONS_PER_QUIZ = 8;
const MAX_CHOICES = 5;
```

2. Add types to the `CourseSpec` interface:
```ts
  quizzes?: Array<{
    title: string;
    description?: string;
    module_week?: number;
    questions: Array<
      | { type: 'multiple_choice'; prompt: string; choices: string[]; correct_index: number; points?: number; explanation?: string }
      | { type: 'true_false'; prompt: string; correct_answer: boolean; points?: number; explanation?: string }
    >;
  }>;
```

3. In `validateCourseSpec`, after the repertoire/roster checks and before `const spec = raw as unknown as CourseSpec;`, add:
```ts
  if (raw.quizzes !== undefined) {
    if (!Array.isArray(raw.quizzes)) return { ok: false, error: 'quizzes must be an array.' };
    if (raw.quizzes.length > MAX_QUIZZES) return { ok: false, error: `too many quizzes (${raw.quizzes.length}, max ${MAX_QUIZZES}).` };
    for (const [qi, qz] of raw.quizzes.entries()) {
      if (!isObj(qz) || typeof qz.title !== 'string' || qz.title.trim() === '') {
        return { ok: false, error: `quiz ${qi + 1} needs a title.` };
      }
      const te = tooLong(`quiz ${qi + 1} title`, qz.title) ?? tooLong(`quiz ${qi + 1} description`, qz.description);
      if (te) return { ok: false, error: te };
      if (!Array.isArray(qz.questions) || qz.questions.length === 0) {
        return { ok: false, error: `quiz ${qi + 1} needs at least one question.` };
      }
      if (qz.questions.length > MAX_QUESTIONS_PER_QUIZ) {
        return { ok: false, error: `quiz ${qi + 1} has ${qz.questions.length} questions (max ${MAX_QUESTIONS_PER_QUIZ}).` };
      }
      for (const [xi, q] of qz.questions.entries()) {
        const where = `quiz ${qi + 1} question ${xi + 1}`;
        if (!isObj(q) || typeof q.prompt !== 'string' || q.prompt.trim() === '') {
          return { ok: false, error: `${where} needs a prompt.` };
        }
        const pe = tooLong(`${where} prompt`, q.prompt);
        if (pe) return { ok: false, error: pe };
        if (q.type === 'multiple_choice') {
          if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > MAX_CHOICES
            || !q.choices.every((c) => typeof c === 'string' && c.trim() !== '')) {
            return { ok: false, error: `${where} needs 2-${MAX_CHOICES} non-empty choices.` };
          }
          if (typeof q.correct_index !== 'number' || q.correct_index < 0 || q.correct_index >= q.choices.length) {
            return { ok: false, error: `${where} correct_index is out of range.` };
          }
        } else if (q.type === 'true_false') {
          if (typeof q.correct_answer !== 'boolean') {
            return { ok: false, error: `${where} (true_false) needs a boolean correct_answer.` };
          }
        } else {
          return { ok: false, error: `${where} has an unsupported type (only multiple_choice and true_false are allowed).` };
        }
        if (q.points !== undefined && (typeof q.points !== 'number' || q.points < 0)) {
          return { ok: false, error: `${where} points must be a non-negative number.` };
        }
      }
    }
  }
```

(`tooLong` and `isObj` already exist in the file.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/_shared/__tests__/courseSpec.test.ts`
Expected: PASS (all quiz tests + the pre-existing tests, incl. the happy path now carrying quizzes).

- [ ] **Step 5: Commit**

```bash
git branch --show-current   # academy-ai-quizzes
git add supabase/functions/_shared/courseSpec.ts supabase/functions/_shared/__tests__/courseSpec.test.ts
git commit -m "feat(academy): validate AI-drafted quizzes (MC + true/false) in CourseSpec"
```

---

### Task 2: Teach the prompt to draft quizzes

**Files:**
- Modify: `supabase/functions/generate-course-draft/prompt.ts`
- Test: `supabase/functions/generate-course-draft/__tests__/prompt.test.ts`

**Interfaces:**
- Consumes: nothing new. Produces: prompt text that instructs quiz generation matching the Task 1 shape.

- [ ] **Step 1: Write the failing test**

Append to `supabase/functions/generate-course-draft/__tests__/prompt.test.ts` inside the existing `describe`:

```ts
  it('instructs quiz drafting with only multiple_choice and true_false', () => {
    const msgs = buildGenerationMessages(input, '2026-07-14T12:00:00Z');
    const all = msgs.map((m) => m.content).join('\n');
    expect(all).toContain('quizzes');
    expect(all).toContain('multiple_choice');
    expect(all).toContain('true_false');
    expect(all).toContain('correct_index');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/generate-course-draft/__tests__/prompt.test.ts`
Expected: FAIL (prompt lacks quiz instructions).

- [ ] **Step 3: Implement**

In `supabase/functions/generate-course-draft/prompt.ts`, extend the system-message schema block to include quizzes, and add a rule. In the schema object description (the big system string), add a line describing the quizzes array:

```ts
    '  "quizzes"?: [{ "title": string, "description"?: string, "module_week"?: number, "questions": [',
    '     { "type": "multiple_choice", "prompt": string, "choices": [string], "correct_index": number (0-based), "points"?: number, "explanation"?: string }',
    '     | { "type": "true_false", "prompt": string, "correct_answer": boolean, "points"?: number, "explanation"?: string } ] }],',
```

and add to the Rules section a quizzes rule:

```ts
    'Quizzes: for the modules that suit a short assessment (NOT every module), draft a quiz of 3-5 questions using ONLY "multiple_choice" and "true_false". Mark the correct answer (correct_index for MC, correct_answer boolean for true/false), keep questions factual and unambiguous, add a one-line explanation each. At most 6 quizzes total. Put the module/topic in the quiz title. These are drafts the teacher will review before publishing.',
```

Place both inside the existing `system` array (the schema line among the shape lines, the rule among the Rules lines). Keep everything else unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/generate-course-draft/__tests__/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git branch --show-current
git add supabase/functions/generate-course-draft/prompt.ts supabase/functions/generate-course-draft/__tests__/prompt.test.ts
git commit -m "feat(academy): prompt drafts MC + true/false quizzes into the course spec"
```

---

### Task 3: Extend `assistant_create_course` RPC to create quizzes (migration + scratch test)

**Files:**
- Create: `supabase/migrations/20260714210000_assistant_create_course_quizzes.sql`
- Test: `supabase/migrations/tests/assistant_create_course_quizzes_test.sql`

**Interfaces:**
- Consumes: deployed `assistant_create_course`, `gw_course_tests`, `gw_course_test_questions`, `grade_test_attempt`, `is_course_editor()`.
- Produces: the RPC also inserts quizzes + questions and returns `quiz_count`. Task 4's message reads `quiz_count`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260714210000_assistant_create_course_quizzes.sql`. It (a) adds an editor insert policy on `gw_course_tests`, and (b) `CREATE OR REPLACE`s `assistant_create_course` — **reproduce the CURRENT function body from `supabase/migrations/20260713220000_assistant_course_builder.sql` verbatim** (read that file; the function spans the `CREATE OR REPLACE FUNCTION public.assistant_create_course(spec jsonb) ... $$;` block), then insert the quiz block shown below immediately BEFORE the final `RETURN jsonb_build_object(...)`, and add `'quiz_count', v_quiz_count` to that returned object plus `v_quiz_count int := 0;`, `q record`, `x record`, `v_test_id uuid`, `v_opts jsonb`, `v_correct jsonb` to the DECLARE section.

Policy (top of the migration):
```sql
-- Course editors (incl. instructors) can create tests via the RPC (existing
-- "Admins can manage tests" is is_admin-flag-only; is_course_editor() is deployed).
DROP POLICY IF EXISTS "Course editors can manage tests" ON public.gw_course_tests;
CREATE POLICY "Course editors can manage tests" ON public.gw_course_tests
  FOR ALL USING (public.is_course_editor()) WITH CHECK (public.is_course_editor());
```

Quiz block to insert before the RETURN (inside the function body):
```sql
  IF jsonb_typeof(spec->'quizzes') = 'array' THEN
    FOR q IN SELECT value AS quiz FROM jsonb_array_elements(spec->'quizzes')
    LOOP
      IF trim(coalesce(q.quiz->>'title','')) = '' THEN RAISE EXCEPTION 'quiz title missing'; END IF;
      INSERT INTO gw_course_tests (course_id, title, description, test_type, total_points, is_published, created_by)
      VALUES (
        v_course_id, q.quiz->>'title', q.quiz->>'description', 'quiz',
        coalesce((SELECT sum(coalesce((qq->>'points')::int, 10)) FROM jsonb_array_elements(q.quiz->'questions') qq), 0),
        false, auth.uid()
      ) RETURNING id INTO v_test_id;
      v_quiz_count := v_quiz_count + 1;

      FOR x IN
        SELECT value AS qn, (ordinality - 1) AS pos
        FROM jsonb_array_elements(coalesce(q.quiz->'questions', '[]'::jsonb)) WITH ORDINALITY
      LOOP
        IF x.qn->>'type' = 'multiple_choice' THEN
          v_opts := (
            SELECT jsonb_agg(jsonb_build_object('id', chr(97 + (c.ord - 1)::int), 'text', c.val))
            FROM jsonb_array_elements_text(x.qn->'choices') WITH ORDINALITY AS c(val, ord)
          );
          v_correct := to_jsonb(chr(97 + (x.qn->>'correct_index')::int));
        ELSIF x.qn->>'type' = 'true_false' THEN
          v_opts := NULL;
          v_correct := to_jsonb((x.qn->>'correct_answer')::boolean);
        ELSE
          RAISE EXCEPTION 'unsupported question type %', x.qn->>'type';
        END IF;

        INSERT INTO gw_course_test_questions (test_id, position, question_type, prompt, options, correct_answer, explanation, points)
        VALUES (
          v_test_id, x.pos::int, x.qn->>'type', x.qn->>'prompt', v_opts, v_correct,
          x.qn->>'explanation', coalesce((x.qn->>'points')::int, 10)
        );
      END LOOP;
    END LOOP;
  END IF;
```

- [ ] **Step 2: Write the migration test**

Create `supabase/migrations/tests/assistant_create_course_quizzes_test.sql`. Reuse the bootstrap pattern from `supabase/migrations/tests/assistant_course_builder_bootstrap.sql` (apply that bootstrap first), then add stand-ins for `gw_course_tests`, `gw_course_test_questions`, `gw_course_test_attempts`, `gw_course_test_answers`, and a minimal `grade_test_attempt(uuid)` — OR (simpler and what this test does) verify the QUESTION ROWS the RPC writes are in the exact format the real grader expects, without needing the full attempts machinery:

```sql
-- Run against a scratch DB with the assistant_course_builder bootstrap + this
-- feature's migration applied. Verifies quiz + question rows land in the exact
-- storage format the engine's grader compares against.
BEGIN;

-- minimal stand-ins for the quiz tables (mirror the real columns used)
CREATE TABLE IF NOT EXISTS gw_course_tests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, title text, description text, test_type text, total_points int,
  is_published boolean, created_by uuid, tenant_id uuid);
CREATE TABLE IF NOT EXISTS gw_course_test_questions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid, position int, question_type text, prompt text, options jsonb,
  correct_answer jsonb, explanation text, points int, tenant_id uuid);
-- the RPC runs SECURITY INVOKER as the test role, so it needs table privileges
GRANT ALL ON gw_course_tests, gw_course_test_questions TO gw_test_authenticated;

SET LOCAL "test.uid" = '00000000-0000-0000-0000-000000000002';
SET LOCAL ROLE gw_test_authenticated;
DO $$ DECLARE r jsonb; BEGIN
  r := assistant_create_course('{
    "title":"Q Course","start_date":"2026-08-24","end_date":"2026-09-11",
    "meeting_patterns":[{"weekday":1,"start_time":"10:00","end_time":"10:50"}],
    "modules":[{"title":"Week 1","week_number":1,"assignments":[]}],
    "quizzes":[{"title":"Quiz 1","questions":[
      {"type":"multiple_choice","prompt":"Who?","choices":["Hogan","Johnson","Hairston"],"correct_index":0,"points":5},
      {"type":"true_false","prompt":"True?","correct_answer":true,"points":5}
    ]}]
  }'::jsonb);
  ASSERT (r->>'quiz_count')::int = 1, 'quiz_count';
END $$;
RESET ROLE;

DO $$ DECLARE mc gw_course_test_questions; tf gw_course_test_questions; t gw_course_tests; BEGIN
  SELECT * INTO t FROM gw_course_tests LIMIT 1;
  ASSERT t.is_published = false, 'quiz must be unpublished';
  ASSERT t.total_points = 10, 'total_points = sum of question points';
  SELECT * INTO mc FROM gw_course_test_questions WHERE question_type='multiple_choice';
  -- options are [{id:'a',text:'Hogan'},...]; correct_answer is the id string 'a'
  ASSERT mc.options->0->>'id' = 'a' AND mc.options->0->>'text' = 'Hogan', 'MC option shape';
  ASSERT mc.correct_answer = to_jsonb('a'::text), 'MC correct_answer is the option id';
  ASSERT mc.position = 0, 'MC position';
  SELECT * INTO tf FROM gw_course_test_questions WHERE question_type='true_false';
  ASSERT tf.options IS NULL AND tf.correct_answer = to_jsonb(true), 'TF options null + boolean correct_answer';
  ASSERT tf.position = 1, 'TF position';
END $$;

ROLLBACK;
```

Note: the bootstrap must also GRANT the quiz stand-in tables to `gw_test_authenticated` and (if RLS is enabled on them there) allow inserts; since these stand-ins have no RLS, the RPC's inserts succeed under the role. The real prod tables' RLS is covered by the added `is_course_editor()` policy (questions policy already admits the course creator).

- [ ] **Step 3: Run migration + test on a scratch DB**

```bash
/opt/homebrew/opt/postgresql@16/bin/dropdb --if-exists quiz_scratch
/opt/homebrew/opt/postgresql@16/bin/createdb quiz_scratch
PSQL="/opt/homebrew/opt/postgresql@16/bin/psql -d quiz_scratch -v ON_ERROR_STOP=1"
$PSQL -f supabase/migrations/tests/assistant_course_builder_bootstrap.sql
$PSQL -f supabase/migrations/20260713220000_assistant_course_builder.sql
$PSQL -f supabase/migrations/20260714210000_assistant_create_course_quizzes.sql
$PSQL -f supabase/migrations/tests/assistant_create_course_quizzes_test.sql
/opt/homebrew/opt/postgresql@16/bin/dropdb quiz_scratch
```
Expected: all ASSERTs pass, exit 0. Iterate on the migration until clean.

- [ ] **Step 4: Commit**

```bash
git branch --show-current
git add supabase/migrations/20260714210000_assistant_create_course_quizzes.sql supabase/migrations/tests/assistant_create_course_quizzes_test.sql
git commit -m "feat(academy): assistant_create_course creates unpublished quizzes + questions"
```

---

### Task 4: Sanitize quiz text + surface quiz count

**Files:**
- Modify: `supabase/functions/generate-course-draft/index.ts` (extend `sanitizeSpecText`)
- Modify: `src/lib/academy/generateCourse.ts` (message)
- Test: `src/lib/academy/__tests__/generateCourse.test.ts`

**Interfaces:**
- Consumes: `quiz_count` from the RPC (Task 3). Produces: sanitized quiz text; success message mentions quizzes when present.

- [ ] **Step 1: Extend sanitizeSpecText (index.ts)**

In `supabase/functions/generate-course-draft/index.ts`, in `sanitizeSpecText`, after the rubric block and before `return spec;`, add:
```ts
  for (const qz of (spec as any).quizzes ?? []) {
    if (qz.title !== undefined) qz.title = stripTags(qz.title);
    if (qz.description !== undefined) qz.description = stripTags(qz.description);
    for (const q of qz.questions ?? []) {
      if (q.prompt !== undefined) q.prompt = stripTags(q.prompt);
      if (q.explanation !== undefined) q.explanation = stripTags(q.explanation);
      if (Array.isArray(q.choices)) q.choices = q.choices.map(stripTags);
    }
  }
```

- [ ] **Step 2: Update the client message test (generateCourse.test.ts)**

In the existing success test in `src/lib/academy/__tests__/generateCourse.test.ts`, add `quiz_count: 2` to the mocked RPC data and assert the message includes quizzes:
```ts
    // in the success test's mocked data object, add: quiz_count: 2
    if (r.ok) { /* existing asserts */ expect(r.message).toContain('2 quizzes'); }
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/lib/academy/__tests__/generateCourse.test.ts`
Expected: FAIL (message lacks quizzes clause).

- [ ] **Step 4: Implement the message (generateCourse.ts)**

In `src/lib/academy/generateCourse.ts`, in the success return's `message`, append a quizzes clause when present:
```ts
    message: `Draft "${String(data.title ?? '')}" created — ${data.module_count} modules, ${data.assignment_count} assignments, ${data.session_count} class sessions${data.quiz_count ? `, ${data.quiz_count} quizzes` : ''}.`,
```

- [ ] **Step 5: Run tests + build**

Run: `npx vitest run src/lib/academy/ supabase/functions/ && npx vite build`
Expected: green + clean build.

- [ ] **Step 6: Commit**

```bash
git branch --show-current
git add supabase/functions/generate-course-draft/index.ts src/lib/academy/generateCourse.ts src/lib/academy/__tests__/generateCourse.test.ts
git commit -m "feat(academy): sanitize quiz text; surface quiz count in the result"
```

---

### Task 5: Verify + PR

- [ ] **Step 1: Full verification**

```bash
git branch --show-current
npx vitest run src/lib/academy/ supabase/functions/
npx vite build
```
Expected: feature suites green; build clean.

- [ ] **Step 2: Push + PR**

```bash
git push -u origin academy-ai-quizzes
gh pr create --title "Glee Academy: AI-drafted quizzes in the course builder" --body "$(cat <<'EOF'
## Summary
The AI course builder now drafts real quizzes (multiple-choice + true/false, with correct answers) into the existing quiz engine, created **unpublished**. The teacher reviews them in the course's Quizzes tab → "Build questions", then publishes; students take them and they auto-grade — all existing machinery. No new tables, no new student UI.

Spec: docs/superpowers/specs/2026-07-14-ai-quiz-generation-design.md
Plan: docs/superpowers/plans/2026-07-14-ai-quiz-generation.md

## What's in it
- Shared `courseSpec` validator: optional `quizzes` (MC + true/false only; other types rejected).
- `generate-course-draft` prompt: drafts short quizzes on suited modules; sanitizes quiz text.
- Migration: `assistant_create_course` inserts `gw_course_tests` (is_published=false) + `gw_course_test_questions` in the engine's exact storage format (MC options `[{id,text}]` + id correct_answer; TF boolean); adds an `is_course_editor()` insert policy on `gw_course_tests`.
- Client: success message includes quiz count.

## Test plan
- [x] vitest: validator (accepts MC/TF, rejects unknown types / bad MC index / non-boolean TF / caps), prompt builder, client message
- [x] SQL migration test on scratch DB: RPC creates an unpublished quiz + 2 questions in the exact grader format (MC option ids + correct_answer id; TF null options + boolean)
- [ ] Post-deploy: apply migration (docker exec supabase-db psql --single-transaction); deploy _shared/ + generate-course-draft/ edge fns + force-recreate; build+rsync web; demo tenant: generate course with quizzes → Quizzes tab → Build questions shows them → publish → take → auto-grades

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Post-merge deploy checklist (with Kevin)
1. Migration: `docker cp` + `docker exec supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 --single-transaction -f` the new migration; verify `\df assistant_create_course` + the new gw_course_tests policy.
2. Edge fns: rsync `_shared/` + `generate-course-draft/` to `/opt/supabase/volumes/functions/` + `docker compose up -d --force-recreate functions`; check logs boot clean.
3. Web: `vite build` + `rsync -az dist/ …:/var/www/gleeworld/html/` (no --delete).
4. Smoke: generate a course with quizzes on the demo tenant → Quizzes tab → Build questions → publish → take → auto-grades.

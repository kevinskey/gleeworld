# Assistant Student Advisor — Phases 1–2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the GleeWorld Assistant read access to a normalized picture of any person's assignments, grades, attendance, and money — so she can advise students about themselves and directors about their roster.

**Architecture:** A private `student_picture` schema holds one small adapter view per source table, each normalizing onto a shared column contract. Four union views sit on top. Six `security invoker` RPCs are the only exposed API; the assistant's edge-function tools call those RPCs, so RLS plus an explicit person filter both apply.

**Tech Stack:** PostgreSQL 15.8 (self-hosted Supabase), Deno edge functions (`supabase/functions/assistant-chat`), Vitest.

## Global Constraints

- **Postgres is 15.8.** `security_invoker` is available and required on every view.
- **`src/integrations/supabase/types.ts` is STALE** — it disagrees with production (e.g. it omits `gw_notifications.tenant_id`, which does exist). Never take a column name from it. Column definitions in this plan came from `information_schema` on production 2026-08-03 and are authoritative.
- **Every table in scope has `tenant_id` directly.** No `course_id → gw_courses` joins are needed for tenant scoping.
- **Migrations are applied by Kevin**, via `ssh root@198.211.113.144 'docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 --single-transaction' < file`. The self-hosted DB has **no `schema_migrations` table** — verify by querying for the object, not by checking a stamp.
- **Never run DDL as `-U postgres`** — functions and views are owned by `supabase_admin`.
- Migration filenames follow `supabase/migrations/YYYYMMDDHHMMSS_name.sql`.
- Edge functions deploy via `scripts/deploy-functions.sh`.
- Assistant tools are **read-only**. No tool in this plan writes.

## Source Inventory (verified on production, 2026-08-03)

Row counts as of build time. Empty tables still get adapters — they will fill when the fall term starts.

| Domain | Sources adapted | Rows today |
|---|---|---|
| Assignments | `gw_assignments` (53), `gw_course_assignments`, `gw_sight_reading_assignments`, `gw_parttrack_assignments`, `music_fundamentals_assignments`, `gw_course_tests` (13), `glee_academy_tests` | 66 |
| Grades | `gw_grades`, `gw_final_grades`, `gw_semester_grades`, `discussion_grades`, `external_grades`, `test_submissions`, `gw_course_test_attempts`, `gw_course_submissions` (1), `gw_assignment_submissions`, `music_fundamentals_submissions` | 1 |
| Attendance | `gw_attendance_records`, `gw_course_attendance`, `gw_event_attendance`, `attendance`, `gw_performance_grades` | 0 |
| Ledger | `gw_student_fees`, `user_payments`, `finance_records` (1) | 1 |

### Deliberately EXCLUDED — do not write adapters for these

Each exclusion is a correctness or safety decision, not an oversight:

- **`gw_ai_draft_grades`** — unreviewed AI draft scores with `instructor_reviewed_at`. Surfacing these to a student before an instructor signs off would show them a grade nobody approved. **Safety exclusion.**
- **`gw_course_attendance_summary`** — pre-aggregated counts (`unexcused_rehearsal_absences`, `tardies`). Unioning it with per-occurrence tables would double-count every absence.
- **`gw_module_assignments`** — despite the name, this is app-module *permissions* (`assigned_to_user_id`, `permissions text[]`), not coursework.
- **`gw_parttrack_scores`** — part-track *processing* status for sheet music (`normalized_mxl_path`, `manifest`, `timbre`). Not a grade.
- **`gw_invoices`** — donor/fundraising invoices (`donor_name`, `donor_organization`). Not student charges.
- **`gw_payments`** — store order payments tied to `order_id`. Not student fees.
- **`receipts`**, **`gw_fee_templates`** — vendor expenses and fee *definitions*. Neither is money a student owes.
- **`gw_fee_payment_plans`** — plan metadata pointing at `student_fee_id`. Joined in as enrichment on the fee row, never emitted as its own ledger row (would double-count the amount).
- **`gw_course_discussions`** — has no due date and no points. Graded discussions enter through `discussion_grades` instead.
- **`gw_hair_nail_submissions`**, **`gw_sight_reading_assignment_items`**, **`gw_attendance_excuses`** — uniform checks, child rows of an assignment, and excuse records joined onto attendance rather than standing alone.

### Deviation from the spec — views are NOT exposed

The spec put `v_student_*` in `public`. This plan keeps **all** views inside `student_picture` and exposes only RPCs.

Reason: `v_student_assignments` expands course-wide assignments across the roster via `gw_course_enrollments`. If a student's RLS lets them see classmates' enrollment rows, an exposed view would let them read classmates' assignment status. Keeping views private and filtering the person inside each RPC removes that path entirely. RLS still applies underneath — this is an added layer, not a replacement.

---

## File Structure

**Created:**
- `supabase/migrations/<ts>_student_picture_schema.sql` — schema, grants, person-resolution helper
- `supabase/migrations/<ts>_student_picture_assignments.sql` — 7 adapters + `v_student_assignments`
- `supabase/migrations/<ts>_student_picture_grades.sql` — 10 adapters + `v_student_grades`
- `supabase/migrations/<ts>_student_picture_attendance.sql` — 5 adapters + `v_student_attendance`
- `supabase/migrations/<ts>_student_picture_ledger.sql` — 3 adapters + `v_student_ledger`
- `supabase/migrations/<ts>_student_picture_rpcs.sql` — the 6 RPCs
- `supabase/functions/assistant-chat/studentPicture.ts` — tool executors
- `supabase/functions/assistant-chat/__tests__/studentPicture.test.ts`
- `scripts/verify-student-picture.sql` — re-runnable verification

**Modified:**
- `supabase/functions/assistant-chat/toolCatalog.ts` — 6 tool definitions
- `supabase/functions/assistant-chat/executors.ts` — dispatch cases
- `supabase/functions/assistant-chat/prompt.ts` — advising block

---

## Task 1: Schema, contract, and person resolution

**Files:**
- Create: `supabase/migrations/<ts>_student_picture_schema.sql`
- Create: `scripts/verify-student-picture.sql`

**Interfaces:**
- Produces: schema `student_picture`; function `student_picture.person_user_id(profile_id uuid) returns uuid`; the four column contracts every later adapter must match.

**Context the implementer needs:** person identity is spelled four different ways across sources — `user_id`, `student_id`, `student_profile_id`, and `student_email`. Every adapter must emit a single `user_id` that matches `auth.uid()`. `gw_profiles` has both an `id` (row PK) and a `user_id` (auth user). Columns named `*_profile_id` reference `gw_profiles.id`; columns named `student_id`/`user_id` already hold the auth user id.

### RESOLVED before dispatch — do not re-run Steps 1 and 1b

The controller ran both verification steps against production on 2026-08-03. Findings, all authoritative:

| Question | Answer |
|---|---|
| `gw_attendance_records.student_profile_id` → ? | **`gw_profiles.id`.** There is NO foreign key, but two independent call sites document it: `src/features/seating-charts/attendance/useChartAttendance.ts:3` and `src/components/course/CourseAttendanceGrid.tsx:33`. `person_user_id()` is correct as written. |
| `gw_profiles.id` vs `user_id` | Different values — equal in only **1 of 846** rows. Never substitute one for the other. |
| `gw_course_enrollments.enrollment_status` | **`'enrolled'`** — all 46 rows. NOT `'active'`. The plan text below has been corrected; if you see `'active'` anywhere, it is a bug. |
| `gw_course_enrollments.user_id` → ? | Matches `gw_profiles.user_id` (43/46; 3 orphans with no profile). Join on `user_id`, not `id`. |
| `gw_assignments.student_id` | **All 53 rows are course-wide** (`student_id` null, `course_id` set). The enrollment fan-out is the only path by which any assignment reaches a student. |
| Supporting columns | `gw_sheet_music.title`, `gw_courses.title`, `gw_profiles.{id,user_id,email,voice_part,tenant_id}` all confirmed present. |

Steps 1 and 1b below are retained as the record of what was checked. **Skip them and start at Step 2.**

- [ ] ~~**Step 1: Verify the `student_profile_id` assumption before building on it**~~ (RESOLVED — see table above)

Run:
```bash
ssh root@198.211.113.144 'docker exec -i supabase-db psql -U supabase_admin -d postgres' <<'SQL'
select conname, pg_get_constraintdef(oid)
  from pg_constraint
 where conrelid = 'public.gw_attendance_records'::regclass
   and contype = 'f';
select count(*) as profiles, count(distinct id) as ids, count(distinct user_id) as user_ids
  from public.gw_profiles;
SQL
```

Expected: a foreign key from `student_profile_id` to `gw_profiles(id)`. **If it instead references `gw_profiles(user_id)` or has no FK, stop and report** — every attendance adapter depends on this.

- [ ] **Step 1b: Confirm the columns the adapters assume but that were never verified**

The inventory query on 2026-08-03 covered only the tables being adapted, not these supporting ones. Each is referenced by an adapter in Tasks 2–3 and would fail at apply time if absent.

```bash
ssh root@198.211.113.144 'docker exec -i supabase-db psql -U supabase_admin -d postgres' <<'SQL'
select table_name, column_name from information_schema.columns
 where table_schema='public'
   and (   (table_name='gw_sheet_music' and column_name='title')
        or (table_name='gw_profiles' and column_name in ('email','voice_part','tenant_id','user_id','id'))
        or (table_name='gw_courses' and column_name='title'))
 order by table_name, column_name;
-- What values does enrollment_status actually take? The adapters filter on 'active'.
select enrollment_status, count(*) from public.gw_course_enrollments
 group by enrollment_status order by 2 desc;
SQL
```

Expected: `gw_sheet_music.title`, `gw_profiles.{email,voice_part,tenant_id,user_id,id}`, `gw_courses.title` all present.

**If `enrollment_status` returns no rows, or uses a value other than `'active'`** (e.g. `'enrolled'`, `'Active'`), every course-wide adapter in Task 2 will silently return zero rows. Fix the literal in all adapters before proceeding — this is the most likely cause of a view that applies cleanly and returns nothing.

- [ ] **Step 2: Write the schema migration**

```sql
-- student_picture: private normalization layer for the assistant advisor.
-- Views here are NOT exposed to PostgREST. Only the RPCs in
-- student_picture_rpcs.sql are callable by clients.
create schema if not exists student_picture;

comment on schema student_picture is
  'Adapter views normalizing assignments/grades/attendance/money onto a shared contract. Private: exposed only through public RPCs.';

grant usage on schema student_picture to authenticated;

-- Resolve a gw_profiles row id to its auth user id.
-- STABLE + security invoker: RLS on gw_profiles still applies.
create or replace function student_picture.person_user_id(profile_id uuid)
returns uuid
language sql
stable
as $$
  select p.user_id from public.gw_profiles p where p.id = profile_id;
$$;

grant execute on function student_picture.person_user_id(uuid) to authenticated;
```

- [ ] **Step 3: Apply and verify**

Apply via the Global Constraints command, then run:
```sql
select nspname from pg_namespace where nspname = 'student_picture';
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'student_picture';
```
Expected: one schema row, one function row. There is no `schema_migrations` table — this query **is** the verification.

- [ ] **Step 4: Write the reusable verification script**

Create `scripts/verify-student-picture.sql`:
```sql
-- Re-runnable check that the student-picture layer is intact.
\echo '-- Views (expect 4 public unions + adapters):'
select table_name from information_schema.views
 where table_schema = 'student_picture' order by table_name;
\echo '-- RPCs (expect 6):'
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and proname like 'sp_%' order by proname;
\echo '-- Every adapter must emit the contract columns:'
select table_name, count(*) as cols from information_schema.columns
 where table_schema = 'student_picture' group by table_name order by table_name;
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*_student_picture_schema.sql scripts/verify-student-picture.sql
git commit -m "feat(advisor): add student_picture schema and person resolution"
```

---

## Task 2: `v_student_assignments` — 7 adapters

**Files:**
- Create: `supabase/migrations/<ts>_student_picture_assignments.sql`

**Interfaces:**
- Consumes: `student_picture.person_user_id(uuid)` from Task 1.
- Produces: `student_picture.v_student_assignments` with columns
  `user_id uuid, tenant_id uuid, source text, source_id uuid, title text, course_id uuid, course_name text, due_at timestamptz, points_possible numeric, status text, submitted_at timestamptz`.
  `status` ∈ `not_started | submitted | graded | missing | excused`.

**The modeling wrinkle:** an assignment row is not a per-student row. `gw_assignments.student_id` is nullable — when set, the assignment targets one student; when null, it targets everyone enrolled in `course_id`. Other sources have no student column at all and are always course-wide. So every adapter must **expand course-wide rows across the roster** via `gw_course_enrollments`, or the view returns assignments belonging to nobody.

- [ ] **Step 1: Write the failing verification test**

Create the test as SQL in `scripts/test-student-picture-assignments.sql`:
```sql
\set ON_ERROR_STOP on
begin;
-- Two students in one course; one course-wide assignment, one targeted.
insert into public.gw_courses (id, title, tenant_id)
  values ('11111111-1111-1111-1111-111111111111','Test Choir',
          (select id from public.gw_tenants limit 1));
insert into public.gw_course_enrollments (course_id, user_id, enrollment_status, tenant_id)
  values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','enrolled',
          (select id from public.gw_tenants limit 1)),
         ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','enrolled',
          (select id from public.gw_tenants limit 1));
insert into public.gw_assignments (id, course_id, title, points, due_at, is_active, tenant_id, student_id)
  values ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111',
          'Course-wide piece', 100, now() + interval '3 days', true,
          (select id from public.gw_tenants limit 1), null),
         ('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111',
          'Just for student two', 50, now() - interval '1 day', true,
          (select id from public.gw_tenants limit 1),'33333333-3333-3333-3333-333333333333');

-- Course-wide assignment must appear for BOTH students.
do $$ declare n int; begin
  select count(*) into n from student_picture.v_student_assignments
   where source_id = '44444444-4444-4444-4444-444444444444';
  if n <> 2 then raise exception 'expected 2 rows for course-wide assignment, got %', n; end if;
end $$;

-- Targeted assignment must appear for exactly one student, and be 'missing' (past due, no submission).
do $$ declare r record; begin
  select user_id, status into r from student_picture.v_student_assignments
   where source_id = '55555555-5555-5555-5555-555555555555';
  if r.user_id <> '33333333-3333-3333-3333-333333333333' then
    raise exception 'targeted assignment leaked to wrong student: %', r.user_id; end if;
  if r.status <> 'missing' then
    raise exception 'expected status missing, got %', r.status; end if;
end $$;
rollback;
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
ssh root@198.211.113.144 'docker exec -i supabase-db psql -U supabase_admin -d postgres' < scripts/test-student-picture-assignments.sql
```
Expected: `ERROR: relation "student_picture.v_student_assignments" does not exist`

- [ ] **Step 3: Write the adapters and the union**

```sql
-- Shared status derivation for an assignment/submission pair.
create or replace function student_picture.assignment_status(
  p_submitted_at timestamptz, p_graded_at timestamptz, p_due_at timestamptz)
returns text language sql immutable as $$
  select case
    when p_graded_at is not null then 'graded'
    when p_submitted_at is not null then 'submitted'
    when p_due_at is not null and p_due_at < now() then 'missing'
    else 'not_started'
  end;
$$;

-- 1. gw_assignments — the unified table. student_id null = course-wide.
create or replace view student_picture.asg_gw_assignments
with (security_invoker = on) as
select
  coalesce(a.student_id, e.user_id)              as user_id,
  a.tenant_id,
  'assignments'::text                            as source,
  a.id                                           as source_id,
  a.title,
  a.course_id,
  c.title                                        as course_name,
  a.due_at,
  a.points::numeric                              as points_possible,
  student_picture.assignment_status(s.submitted_at, g.graded_at, a.due_at) as status,
  s.submitted_at
from public.gw_assignments a
left join public.gw_courses c on c.id = a.course_id
left join public.gw_course_enrollments e
       on a.student_id is null
      and e.course_id = a.course_id
      and e.enrollment_status = 'enrolled'
left join public.gw_submissions s
       on s.assignment_id = a.id
      and s.student_id = coalesce(a.student_id, e.user_id)
left join public.gw_grades g
       on g.assignment_id = a.id
      and g.student_id = coalesce(a.student_id, e.user_id)
where a.is_active is not false
  and coalesce(a.student_id, e.user_id) is not null;

-- 2. gw_course_assignments — always course-wide; due_date not due_at.
create or replace view student_picture.asg_course_assignments
with (security_invoker = on) as
select
  e.user_id, a.tenant_id, 'course_assignment'::text, a.id, a.title::text,
  a.course_id, c.title,
  a.due_date, a.points::numeric,
  student_picture.assignment_status(s.submitted_at, s.graded_at, a.due_date),
  s.submitted_at
from public.gw_course_assignments a
left join public.gw_courses c on c.id = a.course_id
join public.gw_course_enrollments e
     on e.course_id = a.course_id and e.enrollment_status = 'enrolled'
left join public.gw_course_submissions s
     on s.assignment_id = a.id and s.student_id = e.user_id
where a.is_published is not false;

-- 3. gw_sight_reading_assignments — points_possible, due_date, course-wide.
create or replace view student_picture.asg_sight_reading
with (security_invoker = on) as
select
  e.user_id, a.tenant_id, 'sight_reading'::text, a.id, a.title,
  a.course_id, c.title,
  a.due_date, a.points_possible::numeric,
  student_picture.assignment_status(s.submitted_at, s.graded_at, a.due_date),
  s.submitted_at
from public.gw_sight_reading_assignments a
left join public.gw_courses c on c.id = a.course_id
join public.gw_course_enrollments e
     on e.course_id = a.course_id and e.enrollment_status = 'enrolled'
left join public.gw_assignment_submissions s
     on s.assignment_id = a.id and s.user_id = e.user_id
where a.is_active is not false;

-- 4. gw_parttrack_assignments — assigned by ensemble/voice_part, no points, no course.
--    Roster comes from profiles matching the voice part in that tenant.
create or replace view student_picture.asg_parttrack
with (security_invoker = on) as
select
  p.user_id, a.tenant_id, 'parttrack'::text, a.id,
  coalesce(sm.title, 'Part track')::text,
  null::uuid, null::text,
  a.due_date::timestamptz, null::numeric,
  student_picture.assignment_status(null, null, a.due_date::timestamptz),
  null::timestamptz
from public.gw_parttrack_assignments a
left join public.gw_sheet_music sm on sm.id = a.score_id
join public.gw_profiles p
     on p.tenant_id = a.tenant_id
    and (a.voice_part is null or p.voice_part = a.voice_part)
where p.user_id is not null;

-- 5. music_fundamentals_assignments — tenant-wide, max_score.
create or replace view student_picture.asg_music_fundamentals
with (security_invoker = on) as
select
  s.student_id, a.tenant_id, 'music_fundamentals'::text, a.id, a.title,
  null::uuid, null::text,
  a.due_date, a.max_score::numeric,
  student_picture.assignment_status(s.submitted_at, s.graded_at, a.due_date),
  s.submitted_at
from public.music_fundamentals_assignments a
join public.music_fundamentals_submissions s on s.assignment_id = a.id
where a.is_active is not false and s.student_id is not null;

-- 6. gw_course_tests — no due date column; available_until is the deadline.
create or replace view student_picture.asg_course_tests
with (security_invoker = on) as
select
  e.user_id, t.tenant_id, 'course_test'::text, t.id, t.title::text,
  t.course_id, c.title,
  t.available_until, t.total_points::numeric,
  student_picture.assignment_status(at.submitted_at,
    case when at.is_graded then at.submitted_at end, t.available_until),
  at.submitted_at
from public.gw_course_tests t
left join public.gw_courses c on c.id = t.course_id
join public.gw_course_enrollments e
     on e.course_id = t.course_id and e.enrollment_status = 'enrolled'
left join public.gw_course_test_attempts at
     on at.test_id = t.id and at.user_id = e.user_id
where t.is_published is not false;

-- 7. glee_academy_tests — course_id is TEXT here, not uuid.
create or replace view student_picture.asg_academy_tests
with (security_invoker = on) as
select
  s.student_id, t.tenant_id, 'academy_test'::text, t.id, t.title,
  null::uuid, null::text,
  t.due_date, t.total_points::numeric,
  student_picture.assignment_status(s.submitted_at, null, t.due_date),
  s.submitted_at
from public.glee_academy_tests t
join public.test_submissions s on s.test_id = t.id
where t.is_published is not false and s.student_id is not null;

-- Union
create or replace view student_picture.v_student_assignments
with (security_invoker = on) as
  select * from student_picture.asg_gw_assignments
  union all select * from student_picture.asg_course_assignments
  union all select * from student_picture.asg_sight_reading
  union all select * from student_picture.asg_parttrack
  union all select * from student_picture.asg_music_fundamentals
  union all select * from student_picture.asg_course_tests
  union all select * from student_picture.asg_academy_tests;

grant select on all tables in schema student_picture to authenticated;
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
ssh root@198.211.113.144 'docker exec -i supabase-db psql -U supabase_admin -d postgres' < scripts/test-student-picture-assignments.sql
```
Expected: no exceptions, ends with `ROLLBACK`.

- [ ] **Step 5: Confirm the 53 real rows surface**

```sql
select source, count(*) from student_picture.v_student_assignments group by source;
```
Expected: an `assignments` row with a non-zero count. If it is 0 while `gw_assignments` has 53, the enrollment expansion is dropping everything — check that `gw_course_enrollments.enrollment_status` actually uses the literal `'active'`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/*_student_picture_assignments.sql scripts/test-student-picture-assignments.sql
git commit -m "feat(advisor): add v_student_assignments with 7 source adapters"
```

---

## Task 3: `v_student_grades` — 10 adapters

**Files:**
- Create: `supabase/migrations/<ts>_student_picture_grades.sql`

**Interfaces:**
- Produces: `student_picture.v_student_grades` with
  `user_id, tenant_id, source, source_id, title, course_id, course_name, points_earned numeric, points_possible numeric, percent numeric, letter text, graded_at timestamptz, category text, is_final boolean`.

**Two rules that matter:** `gw_ai_draft_grades` is excluded entirely (unreviewed AI scores). `external_grades` keys on `student_email`, not an id, so it needs a `gw_profiles` join — and rows whose email matches nobody are dropped rather than emitted with a null user.

- [ ] **Step 1: Write the failing test**

`scripts/test-student-picture-grades.sql`:
```sql
\set ON_ERROR_STOP on
begin;
insert into public.gw_grades (id, assignment_id, student_id, total_score, max_points,
                              percentage, letter_grade, graded_at, tenant_id)
  values ('66666666-6666-6666-6666-666666666666', null,
          '22222222-2222-2222-2222-222222222222', 85, 100, 85, 'B', now(),
          (select id from public.gw_tenants limit 1));
do $$ declare r record; begin
  select * into r from student_picture.v_student_grades
   where source_id = '66666666-6666-6666-6666-666666666666';
  if r.percent <> 85 then raise exception 'expected percent 85, got %', r.percent; end if;
  if r.is_final then raise exception 'gw_grades rows are not final grades'; end if;
end $$;
rollback;
```

- [ ] **Step 2: Run it, confirm it fails** with `relation ... does not exist`.

- [ ] **Step 3: Write the adapters**

```sql
create or replace view student_picture.grd_gw_grades
with (security_invoker = on) as
select g.student_id, g.tenant_id, 'grade'::text, g.id,
       coalesce(a.title,'Assignment')::text, a.course_id, c.title,
       g.total_score, g.max_points, g.percentage, g.letter_grade,
       g.graded_at, a.category, false
from public.gw_grades g
left join public.gw_assignments a on a.id = g.assignment_id
left join public.gw_courses c on c.id = a.course_id
where g.student_id is not null;

create or replace view student_picture.grd_final
with (security_invoker = on) as
select f.student_id, f.tenant_id, 'final_grade'::text, f.id,
       coalesce(a.title,'Final')::text, f.course_id, c.title,
       f.total_score, f.max_score, f.percentage, f.letter_grade,
       f.graded_at, 'final'::text, true
from public.gw_final_grades f
left join public.gw_assignments a on a.id = f.assignment_id
left join public.gw_courses c on c.id = f.course_id
where f.student_id is not null and f.is_published is not false;

create or replace view student_picture.grd_semester
with (security_invoker = on) as
select s.user_id, s.tenant_id, 'semester'::text, s.id,
       coalesce(s.semester_name,'Semester')::text, null::uuid, null::text,
       s.total_points_earned, s.total_points_possible, s.current_grade,
       s.letter_grade, s.updated_at, 'semester'::text, true
from public.gw_semester_grades s where s.user_id is not null;

create or replace view student_picture.grd_discussion
with (security_invoker = on) as
select d.student_id, d.tenant_id, 'discussion'::text, d.id,
       coalesce(cd.title,'Discussion')::text, cd.course_id, c.title,
       d.total_score, null::numeric, null::numeric, null::text,
       d.graded_at, 'discussion'::text, false
from public.discussion_grades d
left join public.gw_course_discussions cd on cd.id = d.discussion_id
left join public.gw_courses c on c.id = cd.course_id
where d.student_id is not null;

-- external_grades keys on EMAIL. Unmatched emails are dropped, not nulled.
create or replace view student_picture.grd_external
with (security_invoker = on) as
select p.user_id, x.tenant_id, 'external'::text, x.id,
       coalesce(x.exercise_title,'External exercise')::text, null::uuid, null::text,
       ((coalesce(x.pitch_score,0) + coalesce(x.rhythm_score,0)) / 2)::numeric,
       100::numeric,
       ((coalesce(x.pitch_score,0) + coalesce(x.rhythm_score,0)) / 2)::numeric,
       null::text, x.completed_at, x.source, false
from public.external_grades x
join public.gw_profiles p
     on lower(p.email) = lower(x.student_email) and p.tenant_id = x.tenant_id
where p.user_id is not null;

create or replace view student_picture.grd_test_submissions
with (security_invoker = on) as
select t.student_id, t.tenant_id, 'test'::text, t.id,
       coalesce(gt.title,'Test')::text, null::uuid, null::text,
       t.total_score, null::numeric, t.percentage, null::text,
       t.submitted_at, 'test'::text, false
from public.test_submissions t
left join public.glee_academy_tests gt on gt.id = t.test_id
where t.student_id is not null and t.status = 'graded';

create or replace view student_picture.grd_test_attempts
with (security_invoker = on) as
select a.user_id, a.tenant_id, 'course_test'::text, a.id,
       coalesce(t.title,'Test')::text, t.course_id, c.title,
       a.score::numeric, a.max_score::numeric,
       case when a.max_score > 0 then round(a.score::numeric * 100 / a.max_score, 1) end,
       null::text, a.submitted_at, 'test'::text, false
from public.gw_course_test_attempts a
left join public.gw_course_tests t on t.id = a.test_id
left join public.gw_courses c on c.id = t.course_id
where a.user_id is not null and a.is_graded;

create or replace view student_picture.grd_course_submissions
with (security_invoker = on) as
select s.student_id, s.tenant_id, 'course_submission'::text, s.id,
       coalesce(a.title,'Assignment')::text, a.course_id, c.title,
       coalesce(s.points_earned, s.grade), a.points::numeric,
       case when a.points > 0 then round(coalesce(s.points_earned,s.grade) * 100 / a.points, 1) end,
       null::text, s.graded_at, a.assignment_type::text, false
from public.gw_course_submissions s
left join public.gw_course_assignments a on a.id = s.assignment_id
left join public.gw_courses c on c.id = a.course_id
where s.student_id is not null and s.graded_at is not null;

create or replace view student_picture.grd_assignment_submissions
with (security_invoker = on) as
select s.user_id, s.tenant_id, 'sight_reading'::text, s.id,
       coalesce(a.title,'Sight reading')::text, a.course_id, c.title,
       s.score_value, a.points_possible::numeric,
       case when a.points_possible > 0
            then round(s.score_value * 100 / a.points_possible, 1) end,
       null::text, s.graded_at, 'sight_reading'::text, false
from public.gw_assignment_submissions s
left join public.gw_sight_reading_assignments a on a.id = s.assignment_id
left join public.gw_courses c on c.id = a.course_id
where s.user_id is not null and s.graded_at is not null;

create or replace view student_picture.grd_music_fundamentals
with (security_invoker = on) as
select s.student_id, s.tenant_id, 'music_fundamentals'::text, s.id,
       coalesce(a.title,'Exercise')::text, null::uuid, null::text,
       s.score::numeric, a.max_score::numeric,
       case when a.max_score > 0 then round(s.score::numeric * 100 / a.max_score, 1) end,
       null::text, s.graded_at, 'music_fundamentals'::text, false
from public.music_fundamentals_submissions s
left join public.music_fundamentals_assignments a on a.id = s.assignment_id
where s.student_id is not null and s.graded_at is not null;

create or replace view student_picture.v_student_grades
with (security_invoker = on) as
  select * from student_picture.grd_gw_grades
  union all select * from student_picture.grd_final
  union all select * from student_picture.grd_semester
  union all select * from student_picture.grd_discussion
  union all select * from student_picture.grd_external
  union all select * from student_picture.grd_test_submissions
  union all select * from student_picture.grd_test_attempts
  union all select * from student_picture.grd_course_submissions
  union all select * from student_picture.grd_assignment_submissions
  union all select * from student_picture.grd_music_fundamentals;

grant select on all tables in schema student_picture to authenticated;
```

- [ ] **Step 4: Run the test, confirm it passes.**

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*_student_picture_grades.sql scripts/test-student-picture-grades.sql
git commit -m "feat(advisor): add v_student_grades with 10 adapters, excluding AI drafts"
```

---

## Task 4: `v_student_attendance` — 5 adapters

**Files:**
- Create: `supabase/migrations/<ts>_student_picture_attendance.sql`

**Interfaces:**
- Produces: `student_picture.v_student_attendance` with
  `user_id, tenant_id, source, session_id uuid, occurred_at timestamptz, status text, title text, course_id uuid, excuse_status text`.
  `status` ∈ `present | absent | late | excused`.

**Note:** `gw_attendance_records.student_profile_id` needs `person_user_id()`. `gw_course_attendance_summary` is excluded (pre-aggregated — see exclusions).

- [ ] **Step 1: Write the failing test**

`scripts/test-student-picture-attendance.sql`:
```sql
\set ON_ERROR_STOP on
begin;
insert into public.gw_course_attendance (id, course_id, student_id, attendance_date,
                                         status, tenant_id)
  values ('77777777-7777-7777-7777-777777777777', null,
          '22222222-2222-2222-2222-222222222222', current_date, 'Absent',
          (select id from public.gw_tenants limit 1));
do $$ declare r record; begin
  select * into r from student_picture.v_student_attendance
   where session_id = '77777777-7777-7777-7777-777777777777';
  -- Source spells it 'Absent'; the contract requires lowercase 'absent'.
  if r.status <> 'absent' then raise exception 'status not normalized: %', r.status; end if;
end $$;
rollback;
```

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Write the adapters**

```sql
-- Source vocabularies vary in case and wording. One mapper, used everywhere.
create or replace function student_picture.attendance_status(raw text)
returns text language sql immutable as $$
  select case lower(coalesce(raw,''))
    when 'present' then 'present'
    when 'checked_in' then 'present'
    when 'here' then 'present'
    when 'late' then 'late'
    when 'tardy' then 'late'
    when 'excused' then 'excused'
    when 'excused_absence' then 'excused'
    when 'absent' then 'absent'
    when 'unexcused' then 'absent'
    else 'absent'
  end;
$$;

create or replace view student_picture.att_records
with (security_invoker = on) as
select student_picture.person_user_id(r.student_profile_id), r.tenant_id,
       'session'::text, r.attendance_session_id, r.marked_at,
       student_picture.attendance_status(r.status),
       coalesce(s.title,'Attendance')::text, s.course_id,
       e.status
from public.gw_attendance_records r
left join public.gw_attendance_sessions s on s.id = r.attendance_session_id
left join public.gw_attendance_excuses e on e.attendance_id = r.id
where student_picture.person_user_id(r.student_profile_id) is not null;

create or replace view student_picture.att_course
with (security_invoker = on) as
select a.student_id, a.tenant_id, 'course'::text, a.id,
       a.attendance_date::timestamptz,
       student_picture.attendance_status(a.status),
       coalesce(c.title,'Class')::text, a.course_id, null::text
from public.gw_course_attendance a
left join public.gw_courses c on c.id = a.course_id
where a.student_id is not null;

create or replace view student_picture.att_event
with (security_invoker = on) as
select a.user_id, a.tenant_id, 'event'::text, a.event_id,
       coalesce(a.check_in_time, ev.start_date),
       student_picture.attendance_status(a.attendance_status),
       coalesce(ev.title,'Event')::text, ev.course_id, null::text
from public.gw_event_attendance a
left join public.gw_events ev on ev.id = a.event_id
where a.user_id is not null;

create or replace view student_picture.att_legacy
with (security_invoker = on) as
select a.user_id, a.tenant_id, 'event_legacy'::text, a.event_id,
       coalesce(a.recorded_at, ev.start_date),
       student_picture.attendance_status(a.status),
       coalesce(ev.title,'Event')::text, ev.course_id, null::text
from public.attendance a
left join public.gw_events ev on ev.id = a.event_id
where a.user_id is not null;

-- gw_performance_grades carries a status, not a score — it belongs here, not in grades.
create or replace view student_picture.att_performance
with (security_invoker = on) as
select student_picture.person_user_id(g.student_profile_id), g.tenant_id,
       'performance'::text, g.id, g.performance_date::timestamptz,
       student_picture.attendance_status(g.status),
       coalesce(g.performance_name,'Performance')::text, g.course_id, null::text
from public.gw_performance_grades g
where student_picture.person_user_id(g.student_profile_id) is not null;

create or replace view student_picture.v_student_attendance
with (security_invoker = on) as
  select * from student_picture.att_records
  union all select * from student_picture.att_course
  union all select * from student_picture.att_event
  union all select * from student_picture.att_legacy
  union all select * from student_picture.att_performance;

grant select on all tables in schema student_picture to authenticated;
```

- [ ] **Step 4: Run the test, confirm it passes.**

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*_student_picture_attendance.sql scripts/test-student-picture-attendance.sql
git commit -m "feat(advisor): add v_student_attendance with 5 adapters"
```

---

## Task 5: `v_student_ledger` — 3 adapters

**Files:**
- Create: `supabase/migrations/<ts>_student_picture_ledger.sql`

**Interfaces:**
- Produces: `student_picture.v_student_ledger` with
  `user_id, tenant_id, source, source_id, description text, amount_cents bigint, direction text, due_at timestamptz, paid_at timestamptz, status text, plan_id uuid`.
  `direction` ∈ `charge | credit`; `status` ∈ `outstanding | paid | overdue | partial | waived`.

**Money is stored as `numeric` dollars in every source. The contract is `bigint` cents** — convert with `round(amount * 100)`, never float arithmetic.

- [ ] **Step 1: Write the failing test**

`scripts/test-student-picture-ledger.sql`:
```sql
\set ON_ERROR_STOP on
begin;
insert into public.gw_student_fees (id, user_id, amount, due_date, status, tenant_id)
  values ('88888888-8888-8888-8888-888888888888',
          '22222222-2222-2222-2222-222222222222', 120.50,
          current_date - 30, 'unpaid', (select id from public.gw_tenants limit 1));
do $$ declare r record; begin
  select * into r from student_picture.v_student_ledger
   where source_id = '88888888-8888-8888-8888-888888888888';
  if r.amount_cents <> 12050 then
    raise exception 'expected 12050 cents, got %', r.amount_cents; end if;
  if r.status <> 'overdue' then
    raise exception 'unpaid fee 30 days past due must be overdue, got %', r.status; end if;
  if r.direction <> 'charge' then raise exception 'fees are charges'; end if;
end $$;
rollback;
```

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Write the adapters**

```sql
create or replace view student_picture.led_fees
with (security_invoker = on) as
select f.user_id, f.tenant_id, 'fee'::text, f.id,
       coalesce(f.name, f.category, 'Fee')::text,
       round(f.amount * 100)::bigint, 'charge'::text,
       f.due_date::timestamptz,
       coalesce(f.paid_at, f.paid_date::timestamptz),
       case
         when coalesce(f.paid_at, f.paid_date::timestamptz) is not null then 'paid'
         when lower(coalesce(f.status,'')) in ('waived','cancelled') then 'waived'
         when lower(coalesce(f.status,'')) = 'partial' then 'partial'
         when f.due_date is not null and f.due_date < current_date then 'overdue'
         else 'outstanding'
       end,
       pp.id
from public.gw_student_fees f
left join public.gw_fee_payment_plans pp on pp.student_fee_id = f.id
where f.user_id is not null;

create or replace view student_picture.led_payments
with (security_invoker = on) as
select p.user_id, p.tenant_id, 'payment'::text, p.id,
       coalesce(p.notes, p.payment_method, 'Payment')::text,
       round(p.amount * 100)::bigint, 'credit'::text,
       null::timestamptz, p.payment_date::timestamptz, 'paid'::text, null::uuid
from public.user_payments p where p.user_id is not null;

-- finance_records carries both directions in `type`.
create or replace view student_picture.led_finance
with (security_invoker = on) as
select r.user_id, r.tenant_id, 'finance'::text, r.id,
       coalesce(r.description, r.category, 'Ledger entry')::text,
       round(abs(r.amount) * 100)::bigint,
       case when lower(coalesce(r.type,'')) in ('payment','credit','refund')
            then 'credit' else 'charge' end,
       r.date::timestamptz, null::timestamptz,
       case when lower(coalesce(r.type,'')) in ('payment','credit','refund')
            then 'paid' else 'outstanding' end,
       null::uuid
from public.finance_records r where r.user_id is not null;

create or replace view student_picture.v_student_ledger
with (security_invoker = on) as
  select * from student_picture.led_fees
  union all select * from student_picture.led_payments
  union all select * from student_picture.led_finance;

grant select on all tables in schema student_picture to authenticated;
```

- [ ] **Step 4: Run the test, confirm it passes.**

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*_student_picture_ledger.sql scripts/test-student-picture-ledger.sql
git commit -m "feat(advisor): add v_student_ledger with 3 adapters"
```

---

## Task 6: The six RPCs

**Files:**
- Create: `supabase/migrations/<ts>_student_picture_rpcs.sql`

**Interfaces:**
- Consumes: all four views from Tasks 2–5.
- Produces, all in `public`, all `security invoker`, all returning `jsonb`:
  - `sp_assignments(p_user_id uuid default null, p_window text default 'week', p_course_id uuid default null)`
  - `sp_grades(p_user_id uuid default null, p_course_id uuid default null, p_detail text default 'summary')`
  - `sp_grade_trend(p_user_id uuid default null, p_course_id uuid default null, p_window int default 5)`
  - `sp_attendance(p_user_id uuid default null, p_days int default 120)`
  - `sp_balance(p_user_id uuid default null)`
  - `sp_roster_flags(p_flag text)`

**Every RPC returns `{has_data, scope, rows}`.** `scope` is `'self'` when `p_user_id` is null or equals `auth.uid()`, else `'other'` — derived from the *argument*, so an empty result still says a specific person was asked about. This is what stops the assistant saying "Maya has no assignments" when it should say "I can't see any records for Maya."

- [ ] **Step 1: Write the failing test**

`scripts/test-student-picture-rpcs.sql`:
```sql
\set ON_ERROR_STOP on
do $$ declare j jsonb; begin
  j := public.sp_assignments(null, 'week', null);
  if not (j ? 'has_data' and j ? 'scope' and j ? 'rows') then
    raise exception 'contract missing keys: %', j; end if;
  if j->>'scope' <> 'self' then
    raise exception 'null p_user_id must be scope=self, got %', j->>'scope'; end if;
  j := public.sp_assignments('99999999-9999-9999-9999-999999999999','week',null);
  if j->>'scope' <> 'other' then
    raise exception 'explicit other user must be scope=other, got %', j->>'scope'; end if;
end $$;
```

- [ ] **Step 2: Run it, confirm it fails** with `function public.sp_assignments(...) does not exist`.

- [ ] **Step 3: Write the RPCs**

```sql
create or replace function public.sp_assignments(
  p_user_id uuid default null, p_window text default 'week', p_course_id uuid default null)
returns jsonb language plpgsql stable security invoker as $$
declare target uuid := coalesce(p_user_id, auth.uid()); rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(t) order by t.due_at nulls last), '[]'::jsonb)
    into rows from (
    select * from student_picture.v_student_assignments a
     where a.user_id = target
       and (p_course_id is null or a.course_id = p_course_id)
       and case p_window
             when 'week'    then a.due_at between now() and now() + interval '7 days'
             when 'overdue' then a.status = 'missing'
             else true
           end
     limit 200) t;
  return jsonb_build_object(
    'has_data', jsonb_array_length(rows) > 0,
    'scope', case when p_user_id is null or p_user_id = auth.uid() then 'self' else 'other' end,
    'rows', rows);
end $$;

create or replace function public.sp_grades(
  p_user_id uuid default null, p_course_id uuid default null, p_detail text default 'summary')
returns jsonb language plpgsql stable security invoker as $$
declare target uuid := coalesce(p_user_id, auth.uid()); rows jsonb;
begin
  if p_detail = 'all' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.graded_at desc), '[]'::jsonb) into rows
      from (select * from student_picture.v_student_grades g
             where g.user_id = target
               and (p_course_id is null or g.course_id = p_course_id)
             limit 500) t;
  else
    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) into rows from (
      select course_id, coalesce(course_name,'Ungrouped') as course_name,
             round(avg(percent), 1) as average_percent, count(*) as graded_items,
             max(graded_at) as last_graded
        from student_picture.v_student_grades g
       where g.user_id = target and g.percent is not null
         and (p_course_id is null or g.course_id = p_course_id)
       group by course_id, course_name) t;
  end if;
  return jsonb_build_object(
    'has_data', jsonb_array_length(rows) > 0,
    'scope', case when p_user_id is null or p_user_id = auth.uid() then 'self' else 'other' end,
    'rows', rows);
end $$;

-- Trend: last N graded items vs the N before. Fewer than 2N items => has_trend false.
create or replace function public.sp_grade_trend(
  p_user_id uuid default null, p_course_id uuid default null, p_window int default 5)
returns jsonb language plpgsql stable security invoker as $$
declare target uuid := coalesce(p_user_id, auth.uid());
        recent numeric; prior numeric; total int;
begin
  with ordered as (
    select percent, row_number() over (order by graded_at desc) as rn
      from student_picture.v_student_grades
     where user_id = target and percent is not null and graded_at is not null
       and (p_course_id is null or course_id = p_course_id))
  select count(*),
         round(avg(percent) filter (where rn <= p_window), 1),
         round(avg(percent) filter (where rn > p_window and rn <= p_window * 2), 1)
    into total, recent, prior from ordered;
  return jsonb_build_object(
    'has_data', total > 0,
    'has_trend', total >= p_window * 2,
    'scope', case when p_user_id is null or p_user_id = auth.uid() then 'self' else 'other' end,
    'graded_items', total, 'window', p_window,
    'recent_average', recent, 'prior_average', prior,
    'delta', case when recent is not null and prior is not null then recent - prior end);
end $$;

create or replace function public.sp_attendance(
  p_user_id uuid default null, p_days int default 120)
returns jsonb language plpgsql stable security invoker as $$
declare target uuid := coalesce(p_user_id, auth.uid()); counts jsonb; recent jsonb;
begin
  select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) into counts from (
    select status, count(*) as n from student_picture.v_student_attendance
     where user_id = target and occurred_at > now() - (p_days || ' days')::interval
     group by status) s;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.occurred_at desc), '[]'::jsonb) into recent
    from (select occurred_at, status, title from student_picture.v_student_attendance
           where user_id = target and status in ('absent','late')
             and occurred_at > now() - (p_days || ' days')::interval
           order by occurred_at desc limit 10) t;
  return jsonb_build_object(
    'has_data', counts <> '{}'::jsonb,
    'scope', case when p_user_id is null or p_user_id = auth.uid() then 'self' else 'other' end,
    'counts', counts, 'recent_misses', recent);
end $$;

create or replace function public.sp_balance(p_user_id uuid default null)
returns jsonb language plpgsql stable security invoker as $$
declare target uuid := coalesce(p_user_id, auth.uid());
        owed bigint; rows jsonb;
begin
  select coalesce(sum(case when direction = 'charge' then amount_cents
                          else -amount_cents end), 0)
    into owed from student_picture.v_student_ledger
   where user_id = target and status <> 'waived';
  select coalesce(jsonb_agg(to_jsonb(t) order by t.due_at nulls last), '[]'::jsonb) into rows
    from (select * from student_picture.v_student_ledger
           where user_id = target and status in ('outstanding','overdue','partial')
           limit 100) t;
  return jsonb_build_object(
    'has_data', jsonb_array_length(rows) > 0 or owed <> 0,
    'scope', case when p_user_id is null or p_user_id = auth.uid() then 'self' else 'other' end,
    'balance_cents', owed, 'open_items', rows);
end $$;

-- Roster flags. RLS decides which students are visible; a member sees only themselves.
create or replace function public.sp_roster_flags(p_flag text)
returns jsonb language plpgsql stable security invoker as $$
declare rows jsonb;
begin
  if p_flag = 'absences' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.absences desc), '[]'::jsonb) into rows
      from (select user_id, count(*) as absences
              from student_picture.v_student_attendance
             where status = 'absent' and occurred_at > now() - interval '120 days'
             group by user_id having count(*) >= 3 limit 200) t;
  elsif p_flag = 'failing' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.average_percent), '[]'::jsonb) into rows
      from (select user_id, course_id, round(avg(percent),1) as average_percent
              from student_picture.v_student_grades where percent is not null
             group by user_id, course_id having avg(percent) < 70 limit 200) t;
  elsif p_flag = 'missing_work' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.missing desc), '[]'::jsonb) into rows
      from (select user_id, count(*) as missing
              from student_picture.v_student_assignments
             where status = 'missing' group by user_id limit 200) t;
  elsif p_flag = 'owes' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.balance_cents desc), '[]'::jsonb) into rows
      from (select user_id,
                   sum(case when direction='charge' then amount_cents
                            else -amount_cents end) as balance_cents
              from student_picture.v_student_ledger where status <> 'waived'
             group by user_id having sum(case when direction='charge' then amount_cents
                                              else -amount_cents end) > 0 limit 200) t;
  else
    return jsonb_build_object('error', format('unknown flag: %s', p_flag));
  end if;
  return jsonb_build_object('has_data', jsonb_array_length(rows) > 0,
                            'scope','roster','flag',p_flag,'rows',rows);
end $$;

grant execute on function public.sp_assignments(uuid,text,uuid) to authenticated;
grant execute on function public.sp_grades(uuid,uuid,text) to authenticated;
grant execute on function public.sp_grade_trend(uuid,uuid,int) to authenticated;
grant execute on function public.sp_attendance(uuid,int) to authenticated;
grant execute on function public.sp_balance(uuid) to authenticated;
grant execute on function public.sp_roster_flags(text) to authenticated;
```

- [ ] **Step 4: Run the test, confirm it passes.**

- [ ] **Step 5: Add indexes for roster queries**

```sql
create index if not exists idx_gw_grades_student on public.gw_grades (tenant_id, student_id);
create index if not exists idx_gw_assignments_student on public.gw_assignments (tenant_id, student_id);
create index if not exists idx_gw_assignments_course_due on public.gw_assignments (tenant_id, course_id, due_at);
create index if not exists idx_gw_course_attendance_student on public.gw_course_attendance (tenant_id, student_id);
create index if not exists idx_gw_event_attendance_user on public.gw_event_attendance (tenant_id, user_id);
create index if not exists idx_gw_attendance_records_profile on public.gw_attendance_records (tenant_id, student_profile_id);
create index if not exists idx_gw_student_fees_user on public.gw_student_fees (tenant_id, user_id, status);
create index if not exists idx_gw_course_enrollments_course on public.gw_course_enrollments (course_id, enrollment_status);
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/*_student_picture_rpcs.sql scripts/test-student-picture-rpcs.sql
git commit -m "feat(advisor): add six student-picture RPCs with has_data/scope contract"
```

---

## Task 7: Tool executors

**Files:**
- Create: `supabase/functions/assistant-chat/studentPicture.ts`
- Create: `supabase/functions/assistant-chat/__tests__/studentPicture.test.ts`
- Modify: `supabase/functions/assistant-chat/executors.ts`

**Interfaces:**
- Consumes: the six RPCs from Task 6; the `SupabaseLike` and `Deps` types already exported from `executors.ts:4-17`.
- Produces: `executeStudentPictureTool(name: string, args: Record<string, unknown>, deps: Deps): Promise<string>` returning a JSON string.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { executeStudentPictureTool } from '../studentPicture.ts';

const depsWith = (data: unknown) => ({
  supabase: {
    from: () => { throw new Error('tools must call rpc, not from()'); },
    rpc: async () => ({ data, error: null }),
  },
} as never);

describe('executeStudentPictureTool', () => {
  it('passes the RPC envelope through unchanged', async () => {
    const out = await executeStudentPictureTool('get_assignments', {},
      depsWith({ has_data: true, scope: 'self', rows: [{ title: 'Piece' }] }));
    expect(JSON.parse(out)).toEqual({
      has_data: true, scope: 'self', rows: [{ title: 'Piece' }],
    });
  });

  it('reports an RPC error instead of pretending there is no data', async () => {
    const deps = { supabase: { from: () => {},
      rpc: async () => ({ data: null, error: { message: 'permission denied' } }) } } as never;
    const out = await executeStudentPictureTool('get_balance', {}, deps);
    expect(JSON.parse(out)).toEqual({ error: 'permission denied' });
  });

  it('rejects an unknown tool name', async () => {
    const out = await executeStudentPictureTool('get_nothing', {}, depsWith({}));
    expect(JSON.parse(out).error).toContain('get_nothing');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/studentPicture.test.ts`
Expected: FAIL — cannot resolve `../studentPicture.ts`

- [ ] **Step 3: Write the executor**

```typescript
// Student-picture tools. Every one is a thin pass-through to a security-invoker
// RPC — the database decides what the caller may see, not this file.
import type { Deps } from './executors.ts';

const RPC_FOR: Record<string, { fn: string; args: (a: Record<string, unknown>) => Record<string, unknown> }> = {
  get_assignments: { fn: 'sp_assignments', args: (a) => ({
    p_user_id: a.user_id ?? null, p_window: a.window ?? 'week', p_course_id: a.course_id ?? null }) },
  get_grades: { fn: 'sp_grades', args: (a) => ({
    p_user_id: a.user_id ?? null, p_course_id: a.course_id ?? null, p_detail: a.detail ?? 'summary' }) },
  get_grade_trend: { fn: 'sp_grade_trend', args: (a) => ({
    p_user_id: a.user_id ?? null, p_course_id: a.course_id ?? null, p_window: a.window ?? 5 }) },
  get_attendance: { fn: 'sp_attendance', args: (a) => ({
    p_user_id: a.user_id ?? null, p_days: a.days ?? 120 }) },
  get_balance: { fn: 'sp_balance', args: (a) => ({ p_user_id: a.user_id ?? null }) },
  get_roster_flags: { fn: 'sp_roster_flags', args: (a) => ({ p_flag: a.flag ?? 'failing' }) },
};

export async function executeStudentPictureTool(
  name: string, args: Record<string, unknown>, deps: Deps,
): Promise<string> {
  const spec = RPC_FOR[name];
  if (!spec) return JSON.stringify({ error: `Unknown tool: ${name}` });
  if (!deps.supabase.rpc) return JSON.stringify({ error: 'rpc unavailable' });
  const { data, error } = await deps.supabase.rpc(spec.fn, spec.args(args));
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify(data ?? { has_data: false, scope: 'self', rows: [] });
}
```

- [ ] **Step 4: Run the test, confirm it passes.**

- [ ] **Step 5: Wire into the dispatcher**

In `executors.ts`, export the `Deps` interface (add `export` to `interface Deps`), and add before `default:` in the `switch` at `executeServerTool`:

```typescript
      case 'get_assignments':
      case 'get_grades':
      case 'get_grade_trend':
      case 'get_attendance':
      case 'get_balance':
      case 'get_roster_flags':
        return { replyJson: await executeStudentPictureTool(name, args, deps) };
```

with `import { executeStudentPictureTool } from './studentPicture.ts';` at the top. **The `.ts` extension is required** — Deno will not resolve the import without it.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/assistant-chat/studentPicture.ts \
        supabase/functions/assistant-chat/__tests__/studentPicture.test.ts \
        supabase/functions/assistant-chat/executors.ts
git commit -m "feat(advisor): add student-picture tool executors"
```

---

## Task 8: Tool catalog entries

**Files:**
- Modify: `supabase/functions/assistant-chat/toolCatalog.ts`

**Interfaces:**
- Consumes: the `ToolDef` shape and `str()` helper already in that file.
- Produces: six entries in `TOOL_CATALOG`. Five are `minRole: 'member'`; `get_roster_flags` is `minRole: 'admin'`.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/assistant-chat/__tests__/toolCatalog.advisor.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { toolsForRole } from '../toolCatalog.ts';

describe('advisor tools', () => {
  it('gives members the five self tools but not roster flags', () => {
    const names = toolsForRole('member').map((t) => t.name);
    for (const n of ['get_assignments','get_grades','get_grade_trend','get_attendance','get_balance']) {
      expect(names).toContain(n);
    }
    expect(names).not.toContain('get_roster_flags');
  });

  it('gives admins roster flags too', () => {
    expect(toolsForRole('admin').map((t) => t.name)).toContain('get_roster_flags');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — member list will not contain `get_assignments`.

- [ ] **Step 3: Add the catalog entries**

Append to `TOOL_CATALOG` before the closing `];`:

```typescript
  {
    name: 'get_assignments',
    description: 'Upcoming or overdue coursework for the caller, or for another student if user_id is given. Use for "what is due", "what am I behind on".',
    parameters: { type: 'object', properties: {
      window: str('week | overdue | all — defaults to week'),
      course_id: str('Optional course uuid to narrow to one class'),
      user_id: str('Optional gw_profiles user id; omit for the caller'),
    }, required: [] },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_grades',
    description: 'Per-course grade averages, or every graded item when detail is "all". Use for "how am I doing", "show me all my grades".',
    parameters: { type: 'object', properties: {
      detail: str('summary | all — defaults to summary'),
      course_id: str('Optional course uuid'),
      user_id: str('Optional gw_profiles user id; omit for the caller'),
    }, required: [] },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_grade_trend',
    description: 'Compares the average of the last 5 graded items against the 5 before. Use for "am I slipping", "is my grade going up".',
    parameters: { type: 'object', properties: {
      course_id: str('Optional course uuid'),
      user_id: str('Optional gw_profiles user id; omit for the caller'),
    }, required: [] },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_attendance',
    description: 'Attendance counts by status plus the most recent absences and late arrivals.',
    parameters: { type: 'object', properties: {
      days: str('Lookback window in days — defaults to 120'),
      user_id: str('Optional gw_profiles user id; omit for the caller'),
    }, required: [] },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_balance',
    description: 'Outstanding balance in cents plus open charges with due dates. Use for "what do I owe", "am I paid up".',
    parameters: { type: 'object', properties: {
      user_id: str('Optional gw_profiles user id; omit for the caller'),
    }, required: [] },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'get_roster_flags',
    description: 'Directors only. Lists students crossing a concern threshold across the whole roster.',
    parameters: { type: 'object', properties: {
      flag: str('failing | absences | missing_work | owes'),
    }, required: ['flag'] },
    minRole: 'admin', execution: 'server', confirm: false,
  },
```

- [ ] **Step 4: Run the test, confirm it passes.**

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/assistant-chat/toolCatalog.ts \
        supabase/functions/assistant-chat/__tests__/toolCatalog.advisor.test.ts
git commit -m "feat(advisor): register six advisor tools in the catalog"
```

---

## Task 9: The advising prompt block

**Files:**
- Modify: `supabase/functions/assistant-chat/prompt.ts`

**Interfaces:**
- Consumes: `AssistantContext` and the existing note-block pattern (`newsNote`, `projectNote`).
- Produces: `advisingNote`, inserted into the returned array between `newsNote` and `placesNote`.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/assistant-chat/__tests__/prompt.advisor.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../prompt.ts';

const ctx = { firstName: 'Maya', role: 'member' as const, tenantName: 'Test Choir',
  activeModules: ['academy'], nowIso: '2026-08-03T12:00:00Z', timezone: 'America/New_York' };

describe('advising prompt', () => {
  it('tells her to distinguish no-data from all-clear', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('has_data');
    expect(p).toContain('do not congratulate');
  });

  it('warns against reciting balances aloud', () => {
    expect(buildSystemPrompt(ctx)).toContain('read aloud');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails.**

- [ ] **Step 3: Add the block**

Insert before the `return [` statement:

```typescript
  const advisingNote = [
    'Advising (assignments, grades, attendance, balances):',
    '- Tools: get_assignments, get_grades, get_grade_trend, get_attendance, get_balance' +
      (ctx.role === 'admin' ? ', get_roster_flags (roster-wide).' : '.'),
    '- ALWAYS cite the number and the date: "you are at 4 absences, the last was Oct 12" — never "you have missed a few". You have exact data; vagueness is a bug.',
    '- NEVER compute what a tool can return. Do not average percentages yourself, and do not infer a letter grade from a percentage the tool did not give you.',
    '- Every tool returns has_data and scope. If has_data is false, say you have no records — do not congratulate the user on being caught up, because you may simply be unable to see the data.',
    '- If scope is "other" and has_data is false, say "I can\'t see any records for <name>" — NOT "<name> has no assignments". Those are different claims and only the first one is true.',
    '- get_grade_trend also returns has_trend. When it is false there is not enough graded work to call a direction — say so instead of describing a trend from two or three items.',
    '- Lead with the most actionable item. If several things are wrong at once, open with the nearest deadline rather than listing everything.',
    '- You may connect the dots ("your average dipped and you missed the two rehearsals before it") but do not assert causation about someone\'s character or effort.',
    '- Money: factual and non-shaming. Amounts come back in CENTS — convert before speaking ("12050" is $120.50). Point them to the fees page with open_page.',
    '- Grades and balances are often read aloud with other people in the room. Give the headline aloud and offer the detail; never recite an itemized ledger or a full grade list unprompted in voice mode.',
  ].join('\n');
```

Then add `advisingNote,` to the returned array, after `newsNote,`.

- [ ] **Step 4: Run the test, confirm it passes.**

- [ ] **Step 5: Run the full assistant-chat suite**

Run: `npx vitest run supabase/functions/assistant-chat`
Expected: all pass. Existing prompt snapshot tests may need updating for the new block — update them; do not delete them.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/assistant-chat/prompt.ts \
        supabase/functions/assistant-chat/__tests__/prompt.advisor.test.ts
git commit -m "feat(advisor): add advising block to the assistant system prompt"
```

---

## Task 10: Deploy and verify end to end

**Files:** none created; deployment only.

- [ ] **Step 1: Confirm all migrations are applied**

```bash
ssh root@198.211.113.144 'docker exec -i supabase-db psql -U supabase_admin -d postgres' < scripts/verify-student-picture.sql
```
Expected: 4 union views + 25 adapters listed, 6 `sp_*` functions.

- [ ] **Step 2: Reload the PostgREST schema cache**

New RPCs are invisible to the API until the cache reloads:
```bash
ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin -d postgres -c \"notify pgrst, 'reload schema'\""
```

- [ ] **Step 3: Deploy the edge function**

```bash
bash scripts/deploy-functions.sh assistant-chat
```

- [ ] **Step 4: Verify against real data**

Ask the assistant, as a signed-in student: **"What do I have coming up?"**
Expected: she calls `get_assignments` and answers from the 53 rows in `gw_assignments`.

Then ask: **"How are my grades?"**
Expected: she reports having no grade records — **not** that the user is doing well. This is the single most important behavior to confirm, because grades are empty in production today and the wrong answer here is a confident, false reassurance.

- [ ] **Step 5: Run the guard**

Run: `npm run typecheck:guard`
Expected: no newly-introduced errors.

- [ ] **Step 6: Commit any fixes and open the PR**

```bash
git add -A && git commit -m "chore(advisor): phase 1-2 verification fixes"
gh pr create --title "feat(advisor): student-picture layer + assistant advising tools" \
  --body "Phases 1-2 of docs/superpowers/specs/2026-08-03-assistant-student-advisor-design.md"
```

---

## Known limitations at the end of Phase 2

State these plainly rather than discovering them in production:

1. **Three of four domains are empty.** Grades, attendance, and money have essentially no rows as of 2026-08-03. The adapters are correct and tested, but the assistant will honestly report "no records" for those until a term is underway. The `has_data` contract exists precisely so that reads as truth rather than as good news.
2. **`gw_parttrack_assignments` fans out by voice part**, not by enrollment, because the table has no course or student column. A tenant with 80 sopranos and one part-track assignment produces 80 rows. Acceptable at current scale; revisit if part tracks get heavy use.
3. **`external_grades` matches on email.** A student whose `gw_profiles.email` differs from the email they used in the external tool silently gets no rows. There is no fix at this layer — it needs an identity mapping.
4. **No alert engine yet.** Phases 4–5 (rules, dry-run, briefing) are out of scope here and should be planned only after real data exists to tune thresholds against.

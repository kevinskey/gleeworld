-- Allow MUS240 TAs to read grade summaries
drop policy if exists "grade_summaries_select_admins_tas" on public.mus240_grade_summaries;
create policy "grade_summaries_select_admins_tas"
on public.mus240_grade_summaries
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

-- Allow MUS240 TAs to write grade summaries
drop policy if exists "grade_summaries_insert_admins_tas" on public.mus240_grade_summaries;
drop policy if exists "grade_summaries_update_admins_tas" on public.mus240_grade_summaries;

create policy "grade_summaries_insert_admins_tas"
on public.mus240_grade_summaries
for insert
to authenticated
with check (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

create policy "grade_summaries_update_admins_tas"
on public.mus240_grade_summaries
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

-- Allow MUS240 TAs to read midterm submissions
drop policy if exists "midterm_submissions_select_admins_tas" on public.mus240_midterm_submissions;
create policy "midterm_submissions_select_admins_tas"
on public.mus240_midterm_submissions
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

-- Allow MUS240 TAs to read submission grades
drop policy if exists "submission_grades_select_admins_tas" on public.mus240_submission_grades;
create policy "submission_grades_select_admins_tas"
on public.mus240_submission_grades
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

-- Allow MUS240 TAs to write submission grades
drop policy if exists "submission_grades_insert_admins_tas" on public.mus240_submission_grades;
drop policy if exists "submission_grades_update_admins_tas" on public.mus240_submission_grades;

create policy "submission_grades_insert_admins_tas"
on public.mus240_submission_grades
for insert
to authenticated
with check (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

create policy "submission_grades_update_admins_tas"
on public.mus240_submission_grades
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

-- Allow MUS240 TAs to read participation grades
drop policy if exists "participation_grades_select_admins_tas" on public.mus240_participation_grades;
create policy "participation_grades_select_admins_tas"
on public.mus240_participation_grades
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

-- Allow MUS240 TAs to read grading rubrics
drop policy if exists "grading_rubrics_select_admins_tas" on public.mus240_grading_rubrics;
create policy "grading_rubrics_select_admins_tas"
on public.mus240_grading_rubrics
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

-- Ensure RLS is enabled on all tables
alter table if exists public.mus240_grade_summaries enable row level security;
alter table if exists public.mus240_midterm_submissions enable row level security;
alter table if exists public.mus240_submission_grades enable row level security;
alter table if exists public.mus240_participation_grades enable row level security;
alter table if exists public.mus240_grading_rubrics enable row level security;
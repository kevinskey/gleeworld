-- Allow MUS240 TAs to read assignments
drop policy if exists "assignments_select_admins_tas" on public.mus240_assignments;
create policy "assignments_select_admins_tas"
on public.mus240_assignments
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

-- Allow MUS240 TAs to read journal entries
drop policy if exists "journal_entries_select_admins_tas" on public.mus240_journal_entries;
create policy "journal_entries_select_admins_tas"
on public.mus240_journal_entries
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

-- Allow MUS240 TAs to read and write journal grades
drop policy if exists "journal_grades_select_admins_tas" on public.mus240_journal_grades;
drop policy if exists "journal_grades_insert_admins_tas" on public.mus240_journal_grades;
drop policy if exists "journal_grades_update_admins_tas" on public.mus240_journal_grades;

create policy "journal_grades_select_admins_tas"
on public.mus240_journal_grades
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

create policy "journal_grades_insert_admins_tas"
on public.mus240_journal_grades
for insert
to authenticated
with check (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

create policy "journal_grades_update_admins_tas"
on public.mus240_journal_grades
for update
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

-- Ensure RLS is enabled on all tables
alter table if exists public.mus240_assignments enable row level security;
alter table if exists public.mus240_journal_entries enable row level security;
alter table if exists public.mus240_journal_grades enable row level security;
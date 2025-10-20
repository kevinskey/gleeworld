-- Helper functions
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gw_profiles
    where user_id = _user_id
      and (is_admin = true or is_super_admin = true)
  );
$$;

create or replace function public.is_course_ta(_user_id uuid, _course_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.course_teaching_assistants
    where user_id = _user_id
      and course_code = _course_code
      and is_active = true
  );
$$;

-- Drop existing policies if they exist
drop policy if exists "enrollments_select_admins_tas" on public.mus240_enrollments;
drop policy if exists "profiles_select_self_admins_tas" on public.gw_profiles;

-- Ensure RLS is enabled
alter table if exists public.mus240_enrollments enable row level security;
alter table if exists public.gw_profiles enable row level security;

-- Read policies for enrollments (admins or MUS240 TAs)
create policy "enrollments_select_admins_tas"
on public.mus240_enrollments
for select
to authenticated
using (
  public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

-- Read policies for profiles (self, admins, or MUS240 TAs)
create policy "profiles_select_self_admins_tas"
on public.gw_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin(auth.uid())
  or public.is_course_ta(auth.uid(), 'MUS240')
);

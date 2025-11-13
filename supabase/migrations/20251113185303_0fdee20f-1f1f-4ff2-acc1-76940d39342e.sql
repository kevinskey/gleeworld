-- Security-definer helper to avoid recursive RLS lookups
create or replace function public.is_instructor_or_admin(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gw_profiles p
    where p.id = _uid
      and (p.role = 'instructor' or p.is_admin or p.is_super_admin)
  );
$$;

-- Ensure RLS is enabled
alter table public.gw_submissions enable row level security;

-- Replace instructor/admin select policy to use the function
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'gw_submissions' 
      AND policyname = 'Instructors and admins can view all submissions'
  ) THEN
    DROP POLICY "Instructors and admins can view all submissions" ON public.gw_submissions;
  END IF;
END $$;

create policy "Instructors and admins can view all submissions"
on public.gw_submissions
for select
using (public.is_instructor_or_admin(auth.uid()));

-- Keep student self-access policy (create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'gw_submissions' 
      AND policyname = 'Students can view their own submissions'
  ) THEN
    CREATE POLICY "Students can view their own submissions"
    ON public.gw_submissions
    FOR SELECT
    USING (auth.uid() = student_id);
  END IF;
END $$;
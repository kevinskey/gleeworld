-- Helper functions (idempotent)
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

-- Ensure RLS is enabled (idempotent)
alter table if exists public.mus240_enrollments enable row level security;
alter table if exists public.gw_profiles enable row level security;

-- Create policy for mus240_enrollments (admins or MUS240 TAs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'mus240_enrollments' 
      AND policyname = 'enrollments_select_admins_tas'
  ) THEN
    CREATE POLICY "enrollments_select_admins_tas"
    ON public.mus240_enrollments
    FOR SELECT
    TO authenticated
    USING (
      public.is_admin(auth.uid())
      OR public.is_course_ta(auth.uid(), 'MUS240')
    );
  END IF;
END $$;

-- Create policy for gw_profiles (self, admins, or MUS240 TAs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'gw_profiles' 
      AND policyname = 'profiles_select_self_admins_tas'
  ) THEN
    CREATE POLICY "profiles_select_self_admins_tas"
    ON public.gw_profiles
    FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.is_course_ta(auth.uid(), 'MUS240')
    );
  END IF;
END $$;
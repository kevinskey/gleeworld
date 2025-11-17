-- Enable RLS (safe if already enabled)
ALTER TABLE public.mus240_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_journal_grades ENABLE ROW LEVEL SECURITY;

-- Grant SELECT to admins and super admins via gw_profiles flags
CREATE POLICY "Admins can read all MUS240 journals"
ON public.mus240_journal_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

CREATE POLICY "Admins can read all MUS240 journal grades"
ON public.mus240_journal_grades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- Optional: allow instructors flagged in gw_profiles.role = 'instructor'
CREATE POLICY "Instructors can read MUS240 journals"
ON public.mus240_journal_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.role = 'instructor')
  )
);

CREATE POLICY "Instructors can read MUS240 journal grades"
ON public.mus240_journal_grades
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() AND (p.role = 'instructor')
  )
);

-- Enable RLS on all new tables and create the cohort attendance view
-- This addresses the critical security issues

-- Enable RLS on all new tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_cohorts ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'role'),
    'student'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coordinator_for_cohort(cohort_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coordinator_cohorts
    WHERE user_id = auth.uid() AND cohort_id = cohort_id_param
  );
$$;

-- Create the cohort attendance view
CREATE OR REPLACE VIEW public.v_cohort_attendance AS
SELECT
  a.id               AS attendance_id,
  a.event_id,
  e.title            AS event_title,
  e.start_date       AS starts_at,  -- using existing column name
  a.user_id,
  u.name             AS user_name,
  a.status,
  a.recorded_at,
  cm.cohort_id,
  c.name             AS cohort_name,
  c.year             AS cohort_year
FROM public.attendance a
JOIN public.events e        ON e.id = a.event_id
JOIN public.users u         ON u.id = a.user_id
JOIN public.cohort_members cm ON cm.user_id = a.user_id
JOIN public.cohorts c       ON c.id = cm.cohort_id;
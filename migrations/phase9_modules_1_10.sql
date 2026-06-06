-- Phase 9: tables for remaining modules.
-- Rehearsal plans, practice logs, concert details, prospective students.

BEGIN;

CREATE TABLE IF NOT EXISTS public.gw_rehearsal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  title text NOT NULL,
  rehearsal_date date,
  duration_minutes integer,
  body text NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_rehearsal_plans_tenant_idx ON public.gw_rehearsal_plans(tenant_id);
CREATE INDEX IF NOT EXISTS gw_rehearsal_plans_date_idx ON public.gw_rehearsal_plans(rehearsal_date);

CREATE TABLE IF NOT EXISTS public.gw_practice_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_date date NOT NULL DEFAULT CURRENT_DATE,
  minutes integer NOT NULL CHECK (minutes > 0 AND minutes <= 600),
  what_practiced text,
  reflection text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_practice_logs_student_idx ON public.gw_practice_logs(student_user_id);
CREATE INDEX IF NOT EXISTS gw_practice_logs_date_idx ON public.gw_practice_logs(practice_date);
CREATE INDEX IF NOT EXISTS gw_practice_logs_tenant_idx ON public.gw_practice_logs(tenant_id);

CREATE TABLE IF NOT EXISTS public.gw_concert_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  event_id uuid REFERENCES public.gw_events(id) ON DELETE CASCADE,
  venue_name text,
  venue_address text,
  call_time time,
  attire text,
  equipment_list text,
  chaperone_count integer,
  transportation_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);
CREATE INDEX IF NOT EXISTS gw_concert_details_tenant_idx ON public.gw_concert_details(tenant_id);

CREATE TABLE IF NOT EXISTS public.gw_prospective_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  full_name text NOT NULL,
  email text,
  phone text,
  school text,
  grade_level text,
  voice_part text,
  experience text,
  source text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','auditioned','enrolled','declined')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_prospective_students_tenant_idx ON public.gw_prospective_students(tenant_id);
CREATE INDEX IF NOT EXISTS gw_prospective_students_status_idx ON public.gw_prospective_students(status);

-- Triggers + RLS.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_rehearsal_plans','gw_practice_logs','gw_concert_details','gw_prospective_students']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_jwt();', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_restrict ON public.%I;', t);
    EXECUTE format('CREATE POLICY tenant_isolation_restrict ON public.%I AS RESTRICTIVE USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());', t);
    EXECUTE format('DROP POLICY IF EXISTS admins_all ON public.%I;', t);
    EXECUTE format('CREATE POLICY admins_all ON public.%I AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))) WITH CHECK (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin)));', t);
  END LOOP;
END$$;

-- Students manage their own practice logs.
DROP POLICY IF EXISTS self_manage ON public.gw_practice_logs;
CREATE POLICY self_manage ON public.gw_practice_logs FOR ALL TO authenticated
  USING (student_user_id = auth.uid())
  WITH CHECK (student_user_id = auth.uid());

-- Anonymous insert for prospective students (public recruitment form).
DROP POLICY IF EXISTS anon_insert ON public.gw_prospective_students;
CREATE POLICY anon_insert ON public.gw_prospective_students FOR INSERT TO anon
  WITH CHECK (true);

COMMIT;

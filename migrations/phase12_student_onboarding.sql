-- Phase 12: student onboarding — join codes per course + invite tracking.

BEGIN;

ALTER TABLE public.gw_courses
  ADD COLUMN IF NOT EXISTS join_code text;
CREATE UNIQUE INDEX IF NOT EXISTS gw_courses_join_code_unique
  ON public.gw_courses(join_code) WHERE join_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.gw_student_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  email text NOT NULL,
  full_name text,
  course_id uuid REFERENCES public.gw_courses(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','accepted','failed')),
  error text,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email, course_id)
);
CREATE INDEX IF NOT EXISTS gw_student_invites_tenant_idx ON public.gw_student_invites(tenant_id);
CREATE INDEX IF NOT EXISTS gw_student_invites_email_idx ON public.gw_student_invites(email);

DROP TRIGGER IF EXISTS set_tenant_id ON public.gw_student_invites;
CREATE TRIGGER set_tenant_id BEFORE INSERT ON public.gw_student_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_jwt();

ALTER TABLE public.gw_student_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_student_invites;
CREATE POLICY tenant_isolation_restrict ON public.gw_student_invites AS RESTRICTIVE
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
DROP POLICY IF EXISTS admins_all ON public.gw_student_invites;
CREATE POLICY admins_all ON public.gw_student_invites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin)))
  WITH CHECK (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin)));

-- Public lookup: anyone with a join code can look up the course details (anon).
DROP POLICY IF EXISTS public_join_code_read ON public.gw_courses;
CREATE POLICY public_join_code_read ON public.gw_courses FOR SELECT TO anon
  USING (join_code IS NOT NULL);

COMMIT;

-- Parent role + parent↔child link so teachers can message the parents
-- of the students they teach. Parents self-register on
-- /register/parent (a public route on every tenant), entering their own
-- name/email/password plus the STUDENT'S EMAIL. On signup we look for
-- that student in the same tenant: match → verified link; no match →
-- pending link the admin can approve later.
--
-- The link table is tenant-scoped (one tenant's parents never see
-- another's) and small — one row per parent/student pair.

CREATE TABLE IF NOT EXISTS public.gw_parent_children (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.gw_tenants(id),
  parent_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- student_id may be NULL when the entered email doesn't match anyone
  -- yet — the row is kept so an admin can resolve it, and so the
  -- student can be linked in later if they sign up afterwards.
  student_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  student_email  text NOT NULL,
  verified       boolean NOT NULL DEFAULT false,
  relationship   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, parent_id, student_email)
);

CREATE INDEX IF NOT EXISTS gw_parent_children_parent_idx
  ON public.gw_parent_children (tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS gw_parent_children_student_idx
  ON public.gw_parent_children (tenant_id, student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gw_parent_children_email_idx
  ON public.gw_parent_children (tenant_id, lower(student_email));

DROP TRIGGER IF EXISTS trg_gw_parent_children_tenant_default ON public.gw_parent_children;
CREATE TRIGGER trg_gw_parent_children_tenant_default
  BEFORE INSERT ON public.gw_parent_children
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

ALTER TABLE public.gw_parent_children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_pc_tenant_iso ON public.gw_parent_children;
CREATE POLICY gw_pc_tenant_iso
  ON public.gw_parent_children AS RESTRICTIVE
  FOR ALL TO authenticated, anon
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS gw_pc_parent_self ON public.gw_parent_children;
CREATE POLICY gw_pc_parent_self
  ON public.gw_parent_children FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

DROP POLICY IF EXISTS gw_pc_student_self ON public.gw_parent_children;
CREATE POLICY gw_pc_student_self
  ON public.gw_parent_children FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS gw_pc_admin_all ON public.gw_parent_children;
CREATE POLICY gw_pc_admin_all
  ON public.gw_parent_children FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gw_parent_children TO authenticated;

-- Parent signup happens through supabase.auth.signUp, which fires the
-- existing on_auth_user_created_profile trigger (creates gw_profiles).
-- We tack on a SECOND after-insert trigger that inspects
-- raw_user_meta_data for the parent-registration signals and, if
-- present, sets role='parent' on the profile and creates the
-- parent↔child link — all before the user has confirmed email, so an
-- admin can see the pending link the moment the parent finishes the
-- form.
--
-- Runs as SECURITY DEFINER because the parent isn't signed in yet
-- (there's no session during signUp when confirm-email is on) and we
-- need to write across tenant_isolation_restrict. Wrapped in a
-- catch-all EXCEPTION so a bad tenant slug can never fail user
-- creation itself — the parent still gets an account and an admin can
-- create the link manually from the pending queue.

CREATE OR REPLACE FUNCTION public.handle_parent_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_role text;
  v_student_email  text;
  v_tenant_slug    text;
  v_tenant_id      uuid;
  v_student_id     uuid;
BEGIN
  v_requested_role := NEW.raw_user_meta_data->>'requested_role';
  IF v_requested_role IS DISTINCT FROM 'parent' THEN
    RETURN NEW;
  END IF;

  v_student_email := lower(trim(NEW.raw_user_meta_data->>'student_email'));
  v_tenant_slug   := NEW.raw_user_meta_data->>'tenant_slug';

  IF v_tenant_slug IS NULL OR v_student_email IS NULL OR v_student_email = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_tenant_id FROM public.gw_tenants WHERE slug = v_tenant_slug LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Stamp the profile as a parent (and pin its tenant to the tenant the
  -- signup form came from — the auto-DEFAULT can't fire in a
  -- SECURITY DEFINER trigger where current_tenant_id() has no session
  -- context).
  UPDATE public.gw_profiles
     SET role = 'parent',
         tenant_id = v_tenant_id,
         updated_at = now()
   WHERE user_id = NEW.id;

  SELECT user_id INTO v_student_id
    FROM public.gw_profiles
   WHERE tenant_id = v_tenant_id
     AND lower(email) = v_student_email
   LIMIT 1;

  INSERT INTO public.gw_parent_children (tenant_id, parent_id, student_id, student_email, verified)
  VALUES (v_tenant_id, NEW.id, v_student_id, v_student_email, v_student_id IS NOT NULL)
  ON CONFLICT (tenant_id, parent_id, student_email) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never fail auth.users insert on account of parent-linking.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_parent ON auth.users;
CREATE TRIGGER on_auth_user_created_parent
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_parent_registration();

-- When a student signs up AFTER the parent has already registered
-- (student_id was NULL on the link), backfill the link so the parent
-- doesn't stay in "pending" forever. Same trigger shape as above.
CREATE OR REPLACE FUNCTION public.handle_student_backfill_parent_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_slug text;
  v_tenant_id   uuid;
  v_email       text;
BEGIN
  v_email := lower(NEW.email);
  IF v_email IS NULL THEN RETURN NEW; END IF;

  v_tenant_slug := NEW.raw_user_meta_data->>'tenant_slug';
  IF v_tenant_slug IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO v_tenant_id FROM public.gw_tenants WHERE slug = v_tenant_slug LIMIT 1;
  IF v_tenant_id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.gw_parent_children
     SET student_id = NEW.id,
         verified = true,
         updated_at = now()
   WHERE tenant_id = v_tenant_id
     AND lower(student_email) = v_email
     AND student_id IS NULL;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_student_backfill ON auth.users;
CREATE TRIGGER on_auth_user_created_student_backfill
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_student_backfill_parent_link();

COMMENT ON TABLE public.gw_parent_children IS
  'Tenant-scoped parent→student links. student_id NULL = pending (parent registered before the student existed, or entered a non-matching email). Admins verify/repair via Workspace Settings > Parents.';

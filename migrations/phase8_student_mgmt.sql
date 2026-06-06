-- Student Management: notes, instrument checkouts, permission slips.
-- Uniform tracking + parent contacts already live in gw_uniform_assignments
-- and gw_student_intake.emergency_contact_*.

BEGIN;

-- 1. Free-form teacher notes about a student.
CREATE TABLE IF NOT EXISTS public.gw_student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id),
  body text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_student_notes_student_idx ON public.gw_student_notes(student_user_id);
CREATE INDEX IF NOT EXISTS gw_student_notes_tenant_idx ON public.gw_student_notes(tenant_id);

-- 2. Instrument checkout (per-instrument loan tracking).
CREATE TABLE IF NOT EXISTS public.gw_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  name text NOT NULL,
  serial_number text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_instruments_tenant_idx ON public.gw_instruments(tenant_id);

CREATE TABLE IF NOT EXISTS public.gw_instrument_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  instrument_id uuid NOT NULL REFERENCES public.gw_instruments(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_out_at timestamptz NOT NULL DEFAULT now(),
  due_back_at date,
  returned_at timestamptz,
  condition_out text,
  condition_in text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_instrument_checkouts_student_idx ON public.gw_instrument_checkouts(student_user_id);
CREATE INDEX IF NOT EXISTS gw_instrument_checkouts_instrument_idx ON public.gw_instrument_checkouts(instrument_id);
CREATE INDEX IF NOT EXISTS gw_instrument_checkouts_tenant_idx ON public.gw_instrument_checkouts(tenant_id);

-- 3. Permission slips (trips, recordings, photo releases, etc.).
CREATE TABLE IF NOT EXISTS public.gw_permission_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date date,
  signed_at timestamptz,
  signed_by_name text,
  file_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','signed','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gw_permission_slips_student_idx ON public.gw_permission_slips(student_user_id);
CREATE INDEX IF NOT EXISTS gw_permission_slips_tenant_idx ON public.gw_permission_slips(tenant_id);

-- BEFORE INSERT trigger to auto-fill tenant_id from JWT (matches platform pattern).
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_jwt() RETURNS trigger AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_student_notes','gw_instruments','gw_instrument_checkouts','gw_permission_slips']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_jwt();', t);
  END LOOP;
END$$;

-- RLS: tenant isolation + admin read/write.
ALTER TABLE public.gw_student_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_instruments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_instrument_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_permission_slips     ENABLE ROW LEVEL SECURITY;

-- Restrictive tenant gate on every table.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_student_notes','gw_instruments','gw_instrument_checkouts','gw_permission_slips']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_restrict ON public.%I;', t);
    EXECUTE format('CREATE POLICY tenant_isolation_restrict ON public.%I AS RESTRICTIVE USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());', t);
    EXECUTE format('DROP POLICY IF EXISTS admins_all ON public.%I;', t);
    EXECUTE format('CREATE POLICY admins_all ON public.%I AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))) WITH CHECK (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin)));', t);
  END LOOP;
END$$;

-- Student self-read on their own notes/checkouts/slips (read-only).
DROP POLICY IF EXISTS self_read ON public.gw_student_notes;
CREATE POLICY self_read ON public.gw_student_notes FOR SELECT TO authenticated USING (student_user_id = auth.uid());

DROP POLICY IF EXISTS self_read ON public.gw_instrument_checkouts;
CREATE POLICY self_read ON public.gw_instrument_checkouts FOR SELECT TO authenticated USING (student_user_id = auth.uid());

DROP POLICY IF EXISTS self_read ON public.gw_permission_slips;
CREATE POLICY self_read ON public.gw_permission_slips FOR SELECT TO authenticated USING (student_user_id = auth.uid());

COMMIT;

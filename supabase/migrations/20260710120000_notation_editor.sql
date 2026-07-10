-- supabase/migrations/20260710120000_notation_editor.sql
-- Atomic: wrap the whole migration so a failure at the gw_sight_reading_exercises
-- ALTER (its precondition — table + tenant_id column — cannot be verified here)
-- rolls back cleanly instead of leaving a half-applied schema. Every object is also
-- individually idempotent, so the script is safely re-runnable by hand.
BEGIN;

-- Shared trigger: coalesce an explicit NULL tenant_id back to the tenant. The column
-- DEFAULT is suppressed when a client serializes tenant_id: null, and a RESTRICTIVE
-- WITH CHECK then silently rejects the row. (create-or-replace: may already exist —
-- schema-qualified call + pinned search_path so the shared fn resolves deterministically.)
CREATE OR REPLACE FUNCTION public.set_tenant_id_default() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$ BEGIN
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := public.current_tenant_id(); END IF; RETURN NEW; END $$;

-- 1. Individual-student assignment. Nullable, no default: NULL = existing course-wide behavior.
ALTER TABLE public.gw_assignments
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Score-bank tenant plumbing (table already exists).
ALTER TABLE public.gw_sight_reading_exercises
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id(),
  ADD COLUMN IF NOT EXISTS difficulty int,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 3. One assignment -> N exercises. NET-NEW.
CREATE TABLE IF NOT EXISTS public.gw_sight_reading_assignment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id(),
  assignment_id uuid NOT NULL REFERENCES public.gw_assignments(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.gw_sight_reading_exercises(id) ON DELETE RESTRICT,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, exercise_id)
);

DROP TRIGGER IF EXISTS trg_srai_tenant ON public.gw_sight_reading_assignment_items;
CREATE TRIGGER trg_srai_tenant BEFORE INSERT ON public.gw_sight_reading_assignment_items
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

ALTER TABLE public.gw_sight_reading_assignment_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS srai_isolation ON public.gw_sight_reading_assignment_items;
CREATE POLICY srai_isolation ON public.gw_sight_reading_assignment_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS srai_rw ON public.gw_sight_reading_assignment_items;
CREATE POLICY srai_rw ON public.gw_sight_reading_assignment_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;

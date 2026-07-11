-- supabase/migrations/20260710220000_sight_reading_takes.sql
-- Per-student sight-reading take history, so practice progress syncs across a
-- student's devices instead of living only in one browser's localStorage.
-- Follows the tenant-plumbing pattern from 20260710120000_notation_editor.sql:
-- tenant_id DEFAULT current_tenant_id() + the shared set_tenant_id_default()
-- BEFORE INSERT trigger (a serialized `tenant_id: null` suppresses the column
-- DEFAULT and a RESTRICTIVE WITH CHECK then silently rejects the row).
BEGIN;

-- Shared trigger fn — create only if absent (it may already exist owned by a
-- more-privileged role; CREATE OR REPLACE would fail "must be owner" for the
-- non-superuser that owns the app tables). See the notation-editor migration.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'set_tenant_id_default' AND n.nspname = 'public'
  ) THEN
    CREATE FUNCTION public.set_tenant_id_default() RETURNS trigger
    LANGUAGE plpgsql SET search_path = public, pg_temp
    AS $fn$ BEGIN
      IF NEW.tenant_id IS NULL THEN NEW.tenant_id := public.current_tenant_id(); END IF; RETURN NEW; END $fn$;
  END IF;
END
$do$;

CREATE TABLE IF NOT EXISTS public.gw_sight_reading_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  overall int NOT NULL,
  pitch int,
  rhythm int,
  retention int,
  first_note_ok boolean,
  exercise_key text,
  mode text,
  level int,
  bars int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The progress query: a student's most recent takes, newest first.
CREATE INDEX IF NOT EXISTS idx_gwsrt_user_created_at
  ON public.gw_sight_reading_takes (user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_srt_tenant ON public.gw_sight_reading_takes;
CREATE TRIGGER trg_srt_tenant BEFORE INSERT ON public.gw_sight_reading_takes
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

ALTER TABLE public.gw_sight_reading_takes ENABLE ROW LEVEL SECURITY;

-- RESTRICTIVE: every row is confined to its tenant (AND-ed with the permissive
-- policy below), matching the platform-wide isolation model.
DROP POLICY IF EXISTS srt_isolation ON public.gw_sight_reading_takes;
CREATE POLICY srt_isolation ON public.gw_sight_reading_takes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Permissive: a student may only see and write their OWN takes. Teacher-facing
-- read across a class is intentionally a separate, later change.
DROP POLICY IF EXISTS srt_owner ON public.gw_sight_reading_takes;
CREATE POLICY srt_owner ON public.gw_sight_reading_takes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;

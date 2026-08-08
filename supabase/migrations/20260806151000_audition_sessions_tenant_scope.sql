-- C4 fix (2026-08-06 review): audition_sessions has never been
-- tenant-scoped.
--
-- public-intake's preflight/writeRecord (and the pre-existing authenticated
-- flow at src/pages/AuditionPage.tsx:84, unchanged by this migration) both
-- run `SELECT id FROM audition_sessions WHERE is_active = true LIMIT 1` with
-- no tenant filter at all — there has never been a tenant_id column to
-- filter by. Before this feature, that only mattered for signed-in members;
-- public-intake now makes the identical query reachable by an anonymous
-- visitor on ANY of the platform's tenant sites. A tenant with no audition
-- process of its own silently absorbs applicants into whichever tenant's
-- session happens to sort first, and a tenant WITH its own session has no
-- guarantee its own visitors reach it instead of a stranger's.
--
-- Scope of this migration is deliberately narrow: audition_sessions only.
-- audition_applications and gw_appointments have the same structural gap
-- (see the accompanying fix report) but retrofitting either safely requires
-- auditing every existing admin query and RLS policy that reads them today
-- with none scoped by tenant — real work, not a one-file migration, and not
-- done blind in this pass. This migration closes the sharpest, now-publicly-
-- reachable exploit (silent cross-tenant session attachment) without
-- touching those wider surfaces.

ALTER TABLE public.audition_sessions
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.gw_tenants(id);

-- Backfill: every row predates tenant scoping for this feature. Attribute
-- them to 'main' (falling back to the oldest tenant if 'main' doesn't
-- exist) so whichever tenant has been running auditions keeps seeing
-- exactly the sessions it has today — this migration does not change
-- anyone's existing visible behavior, it only stops OTHER tenants from
-- silently sharing it.
DO $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT id INTO v_tenant FROM public.gw_tenants WHERE slug = 'main';
  IF v_tenant IS NULL THEN
    SELECT id INTO v_tenant FROM public.gw_tenants ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_tenant IS NOT NULL THEN
    UPDATE public.audition_sessions
       SET tenant_id = v_tenant
     WHERE tenant_id IS NULL;
  END IF;
END $$;

ALTER TABLE public.audition_sessions
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();

CREATE INDEX IF NOT EXISTS idx_audition_sessions_tenant_active
  ON public.audition_sessions (tenant_id, is_active);

-- Future authenticated inserts (tenant admins creating a session from their
-- own dashboard) get tenant_id filled automatically — this trigger already
-- exists (20260610150000_anon_tenant_isolation.sql) and is reused as-is.
DROP TRIGGER IF EXISTS trg_audition_sessions_tenant_default ON public.audition_sessions;
CREATE TRIGGER trg_audition_sessions_tenant_default
  BEFORE INSERT ON public.audition_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

-- RESTRICTIVE isolation for direct (non-service-role) reads/writes —
-- authenticated members only ever see their own tenant's sessions now,
-- which incidentally also closes the pre-existing cross-tenant read at
-- AuditionPage.tsx:84 for signed-in users without that file changing.
-- Service-role callers (public-intake) bypass RLS entirely regardless, so
-- the edge function's own explicit `.eq('tenant_id', ...)` filter (not this
-- policy) is what scopes ITS queries — this policy only protects the
-- authenticated/anon paths.
ALTER TABLE public.audition_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audition_sessions_tenant_iso ON public.audition_sessions;
CREATE POLICY audition_sessions_tenant_iso ON public.audition_sessions
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Make sure PostgREST picks up the new column on next request.
NOTIFY pgrst, 'reload schema';

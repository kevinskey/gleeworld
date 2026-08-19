-- Fix: "No availability set" after saving hours in Studio Hours.
--
-- gw_services and gw_service_availability both carry tenant_id (added during
-- the tenant-isolation rollout), but neither got a default or a fill trigger,
-- and the client writes availability rows straight from the browser without
-- one. Result: rows land with tenant_id NULL — rejected outright where a
-- restrictive tenant policy applies, and invisible to tenant-scoped reads
-- where it doesn't. Either way the service card reports "No availability set".
--
-- Three parts:
--   1. Give both tables the standard default + BEFORE INSERT fill trigger.
--   2. Backfill NULL rows: services from their creator's profile, availability
--      from its parent service (the parent is always the right answer — an
--      availability window cannot belong to a different tenant than its
--      service).
--   3. Replace the browser's direct delete+insert with a definer RPC, so the
--      write is atomic and tenant_id is never the client's problem again.

-- ── 1. Defaults + fill triggers ──────────────────────────────────────────
-- Guarded so this migration is safe on a database where the tenant rollout
-- has not reached these tables yet.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'gw_services' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.gw_services ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'gw_service_availability' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.gw_service_availability ALTER COLUMN tenant_id SET DEFAULT current_tenant_id();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.gw_services_fill_tenant()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_services_fill_tenant_trg ON public.gw_services;
CREATE TRIGGER gw_services_fill_tenant_trg
  BEFORE INSERT ON public.gw_services
  FOR EACH ROW EXECUTE FUNCTION public.gw_services_fill_tenant();

-- Availability inherits from its service first — that is authoritative even
-- when the writer's session tenant is ambiguous — and only then falls back to
-- the session tenant.
CREATE OR REPLACE FUNCTION public.gw_service_availability_fill_tenant()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT s.tenant_id INTO NEW.tenant_id
      FROM public.gw_services s WHERE s.id = NEW.service_id;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_service_availability_fill_tenant_trg ON public.gw_service_availability;
CREATE TRIGGER gw_service_availability_fill_tenant_trg
  BEFORE INSERT ON public.gw_service_availability
  FOR EACH ROW EXECUTE FUNCTION public.gw_service_availability_fill_tenant();

-- ── 2. Backfill orphaned rows ────────────────────────────────────────────
-- Services with a NULL tenant follow whoever created them. Anything still
-- NULL after that (no creator, or a creator with no tenant) goes to main,
-- which is where every pre-multi-tenant row already lived.

UPDATE public.gw_services s
   SET tenant_id = p.tenant_id
  FROM public.gw_profiles p
 WHERE s.tenant_id IS NULL
   AND p.user_id = s.created_by
   AND p.tenant_id IS NOT NULL;

UPDATE public.gw_services
   SET tenant_id = (SELECT id FROM public.gw_tenants WHERE slug = 'main')
 WHERE tenant_id IS NULL;

UPDATE public.gw_service_availability a
   SET tenant_id = s.tenant_id
  FROM public.gw_services s
 WHERE a.tenant_id IS NULL
   AND s.id = a.service_id
   AND s.tenant_id IS NOT NULL;

-- ── 3. Atomic availability replace ───────────────────────────────────────
-- The browser previously ran a DELETE then an INSERT as two separate
-- PostgREST calls. Besides the tenant problem, a failure between them left a
-- service with no bookable hours at all. One definer function fixes both.
--
-- p_rows is [{"day_of_week":1,"start_time":"09:00","end_time":"17:00"}, ...];
-- only the days that should be open are passed.
CREATE OR REPLACE FUNCTION public.set_service_availability(
  p_service_id uuid,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  svc RECORD;
  inserted integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO svc FROM public.gw_services WHERE id = p_service_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  -- Only the service owner or an admin may reshape its hours.
  IF NOT (svc.created_by = auth.uid() OR public.is_admin_user()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed to edit this service');
  END IF;

  DELETE FROM public.gw_service_availability WHERE service_id = p_service_id;

  INSERT INTO public.gw_service_availability
    (service_id, day_of_week, start_time, end_time, is_active, tenant_id)
  SELECT
    p_service_id,
    (r->>'day_of_week')::int,
    (r->>'start_time')::time,
    (r->>'end_time')::time,
    true,
    svc.tenant_id
  FROM jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r
  WHERE (r->>'day_of_week')::int BETWEEN 0 AND 6
    AND (r->>'end_time')::time > (r->>'start_time')::time;

  GET DIAGNOSTICS inserted = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'days_open', inserted);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_service_availability(uuid, jsonb) TO authenticated;

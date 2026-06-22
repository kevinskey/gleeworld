-- Phase: lock the published demo-viewer account to read-only.
--
-- Strategy: a profile-level flag is_demo_viewer, surfaced into the JWT by
-- the existing custom_access_token_hook as a `demo_viewer` claim, then
-- enforced by RESTRICTIVE RLS policies on every public table. The tenant
-- itself stays editable for all non-flagged users (Kevin, future
-- demo-editor accounts, etc.) — only sessions whose JWT carries
-- demo_viewer=true are blocked from writing.

-- 1. Profile flag
ALTER TABLE public.gw_profiles
  ADD COLUMN IF NOT EXISTS is_demo_viewer boolean NOT NULL DEFAULT false;

-- 2. Helper used by every RESTRICTIVE policy below. STABLE so PostgREST
--    plans efficient queries. Defaults to false if the claim is absent.
CREATE OR REPLACE FUNCTION public.is_demo_viewer()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(auth.jwt() ->> 'demo_viewer', '')::boolean, false);
$$;

-- 3. Extend the GoTrue access token hook to surface demo_viewer.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  claims jsonb;
  user_tenant_id uuid;
  user_tenant_slug text;
  user_role text;
  user_is_demo_viewer boolean;
BEGIN
  claims := event->'claims';

  SELECT tm.tenant_id, t.slug, tm.role
  INTO user_tenant_id, user_tenant_slug, user_role
  FROM public.gw_tenant_members tm
  JOIN public.gw_tenants t ON t.id = tm.tenant_id
  WHERE tm.user_id = (event->>'user_id')::uuid
  ORDER BY tm.created_at ASC
  LIMIT 1;

  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
    claims := jsonb_set(claims, '{tenant_slug}', to_jsonb(user_tenant_slug));
    claims := jsonb_set(claims, '{tenant_role}', to_jsonb(user_role));
  END IF;

  SELECT COALESCE(p.is_demo_viewer, false)
  INTO user_is_demo_viewer
  FROM public.gw_profiles p
  WHERE p.user_id = (event->>'user_id')::uuid;

  IF user_is_demo_viewer THEN
    claims := jsonb_set(claims, '{demo_viewer}', to_jsonb(true));
  END IF;

  RETURN jsonb_build_object('claims', claims);
END;
$function$;

-- 4. Apply RESTRICTIVE write-blocking policies to every public table that
--    already has RLS enabled. Two policies per table: one covers
--    INSERT/UPDATE via WITH CHECK, the other covers DELETE via USING.
--    SELECT is intentionally not gated — demo viewers can look at
--    everything; they just can't change it.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS demo_viewer_no_modify ON public.%I', r.tname);
    EXECUTE format(
      'CREATE POLICY demo_viewer_no_modify ON public.%I
         AS RESTRICTIVE
         FOR ALL
         USING (true)
         WITH CHECK (NOT public.is_demo_viewer())',
      r.tname
    );

    EXECUTE format('DROP POLICY IF EXISTS demo_viewer_no_delete ON public.%I', r.tname);
    EXECUTE format(
      'CREATE POLICY demo_viewer_no_delete ON public.%I
         AS RESTRICTIVE
         FOR DELETE
         USING (NOT public.is_demo_viewer())',
      r.tname
    );
  END LOOP;
END $$;

-- 5. Flag the published demo-viewer account.
UPDATE public.gw_profiles
SET is_demo_viewer = true
WHERE user_id = 'd9629bf9-6944-4d94-b830-e877267df29b';

-- gw_profiles.active_tenant_id — per-user pointer to the tenant the
-- JWT should currently be scoped to, separate from `tenant_id` (which
-- stays as the user's HOME tenant). This lets a multi-tenant user
-- switch between worlds without corrupting their signup / home tenant.
--
-- Prior attempt (see 20260725170000_set_active_tenant_rpc.sql) rewrote
-- `tenant_id` directly, which broke sign-in on the home tenant every
-- time the user switched away — a fresh sign-in on gleeworld.org
-- rendered the marketing landing because the JWT still claimed the
-- last-switched tenant. Reverting that here: set_active_tenant now
-- updates `active_tenant_id`, and the JWT hook prefers it when set.

-- 1. The pointer column.
ALTER TABLE public.gw_profiles
  ADD COLUMN IF NOT EXISTS active_tenant_id uuid REFERENCES public.gw_tenants(id) ON DELETE SET NULL;

-- 2. JWT hook — prefer active_tenant_id if it points at a real membership.
--    Kept the earlier fallback order intact (matching profile.tenant_id
--    then earliest membership) so existing users' behavior is unchanged
--    until they actively switch. active_tenant_id being NULL is the
--    common case for everyone who never touches the switcher.
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
  LEFT JOIN public.gw_profiles p ON p.user_id = tm.user_id
  WHERE tm.user_id = (event->>'user_id')::uuid
  ORDER BY
    -- 1. Active pointer (set by set_active_tenant) — highest priority.
    (tm.tenant_id = p.active_tenant_id) DESC NULLS LAST,
    -- 2. Home tenant (profile.tenant_id) — pre-existing behavior.
    (tm.tenant_id = p.tenant_id) DESC NULLS LAST,
    -- 3. Earliest membership — legacy fallback.
    tm.created_at ASC
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

-- 3. Rewrite set_active_tenant to touch active_tenant_id, not tenant_id.
--    Same membership check, same auth.uid() scope; the difference is
--    that the user's home tenant is preserved.
CREATE OR REPLACE FUNCTION public.set_active_tenant(target_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '28000';
  END IF;

  SELECT t.id
    INTO v_tenant_id
  FROM public.gw_tenants t
  JOIN public.gw_tenant_members m
    ON m.tenant_id = t.id
   AND m.user_id  = v_uid
  WHERE t.slug = target_slug
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'not_a_member_of_%', target_slug USING ERRCODE = '42501';
  END IF;

  UPDATE public.gw_profiles
     SET active_tenant_id = v_tenant_id,
         updated_at = now()
   WHERE user_id = v_uid;

  RETURN target_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_active_tenant(text) TO authenticated;

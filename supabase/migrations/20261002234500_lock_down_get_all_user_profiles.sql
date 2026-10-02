-- SECURITY: get_all_user_profiles() was dumping every profile on the platform
-- to anyone holding the publishable anon key.
--
-- 20250822195103 created it correctly, gated on is_admin/is_super_admin.
-- 20250822195624, five minutes later, DROPped and recreated it with the gate
-- DELETED and this comment in its place:
--
--     -- The ModuleAccess component will handle the permission checking
--     -- on the frontend
--
-- A frontend check is not access control. The DROP also reset the function's
-- ACL to the Postgres default (EXECUTE TO PUBLIC), which on Supabase reaches
-- `anon` — the key published in every page's JavaScript.
--
-- Confirmed live on 2026-10-02 before this migration:
--     POST /rest/v1/rpc/get_all_user_profiles   apikey: <anon>
--     -> HTTP 200, 152 KB, 866 rows
-- email + full_name + role + created_at for every member of every tenant:
-- Yo-Doc, The Lyke House, Spelman students, and the platform admins. No sign-in
-- required. SECURITY DEFINER bypassed gw_profiles' own-row-only RLS, and there
-- was no tenant predicate either, so even a legitimate tenant admin was shown
-- every other tenant's roster.
--
-- This restores the gate, adds the tenant scoping it never had, and revokes the
-- default PUBLIC grant.
--
-- Callers: src/pages/admin/ModuleAccess.tsx and src/pages/admin/Permissions.tsx.
-- Both are admin screens, so narrowing to tenant staff does not change what a
-- legitimate user of either page can legitimately do — a tenant admin now sees
-- their own tenant instead of all of them, which is the correct behaviour.

CREATE OR REPLACE FUNCTION public.get_all_user_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    p.user_id AS id,
    p.email,
    p.full_name,
    p.role,
    p.created_at
  FROM public.gw_profiles p
  WHERE p.user_id IS NOT NULL
    -- Caller must be signed in. auth.uid() is NULL for anon, so this alone
    -- closes the published-key path even if the grants below ever regress.
    AND auth.uid() IS NOT NULL
    AND (
      -- Platform owner: the whole estate, deliberately.
      EXISTS (
        SELECT 1 FROM public.gw_profiles me
        WHERE me.user_id = auth.uid()
          AND me.is_super_admin = true
      )
      -- Tenant admin: their OWN tenant's roster only. The pre-2026 version had
      -- no tenant predicate at all, which is how admins saw each other's.
      OR EXISTS (
        SELECT 1 FROM public.gw_profiles me
        WHERE me.user_id = auth.uid()
          AND me.is_admin = true
          AND p.tenant_id IS NOT DISTINCT FROM COALESCE(me.active_tenant_id, me.tenant_id)
      )
    )
  ORDER BY p.full_name NULLS LAST, p.email;
$$;

-- The load-bearing half. Without this the function is reachable with the
-- publishable key regardless of what the body says.
REVOKE ALL ON FUNCTION public.get_all_user_profiles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_all_user_profiles() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_user_profiles() TO authenticated;

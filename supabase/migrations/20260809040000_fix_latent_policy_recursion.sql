-- The latent half of the self-reference audit (see #569, #570).
--
-- These four do not raise 42P17 today, but only by accident:
--
--   * user_roles / alumnae_global_settings — the recursive branch sits in an
--     INSERT policy that a SIBLING permissive policy satisfies first, so the
--     OR short-circuits before the self-scan is ever evaluated. Narrow or
--     remove that sibling and the insert path starts failing.
--   * is_super_admin() / has_role() — both read user_roles_multi without
--     SECURITY DEFINER, and user_roles_multi's own policy urm_self_read calls
--     is_super_admin(). It stays quiet only because user_roles_multi has 0
--     rows, so the qual is never evaluated. The first row makes it live.
--
-- Same fix as before: the self-lookup moves into a SECURITY DEFINER helper.

-- ── 1. user_roles: "Bootstrap first admin" ──────────────────────────────────
--
-- WITH CHECK was:
--   auth.uid() = user_id AND role = 'admin' AND NOT EXISTS (
--     SELECT 1 FROM user_roles ur WHERE ur.role = 'admin')
--
-- Worth noting beyond the recursion: this guard is "let the very first admin
-- create themselves". Evaluated under the caller's RLS, the inner scan sees
-- only the rows the caller may read — so if RLS hid the existing admin rows,
-- NOT EXISTS came back true and ANY authenticated user satisfied a policy
-- meant to fire exactly once on an empty table. Running the check as
-- SECURITY DEFINER makes it consider every row, which is both what the
-- policy name intends and strictly narrower than the old behaviour.

CREATE OR REPLACE FUNCTION public.admin_role_exists()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.role = 'admin'::app_role
  );
$$;

COMMENT ON FUNCTION public.admin_role_exists() IS
  'Does any admin row exist in user_roles? SECURITY DEFINER so the bootstrap '
  'policy sees every row rather than only the caller-visible ones, and so it '
  'does not re-enter user_roles RLS (42P17).';

DROP POLICY IF EXISTS "Bootstrap first admin" ON public.user_roles;

CREATE POLICY "Bootstrap first admin" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'admin'::app_role
  AND NOT public.admin_role_exists()
);

-- ── 2. alumnae_global_settings: "Bootstrap settings insert when empty" ──────
--
-- WITH CHECK was: NOT EXISTS (SELECT 1 FROM alumnae_global_settings)

CREATE OR REPLACE FUNCTION public.alumnae_global_settings_is_empty()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.alumnae_global_settings);
$$;

COMMENT ON FUNCTION public.alumnae_global_settings_is_empty() IS
  'Is alumnae_global_settings empty? SECURITY DEFINER so the bootstrap policy '
  'does not re-enter the table''s own RLS (42P17).';

DROP POLICY IF EXISTS "Bootstrap settings insert when empty" ON public.alumnae_global_settings;

CREATE POLICY "Bootstrap settings insert when empty" ON public.alumnae_global_settings
FOR INSERT TO authenticated
WITH CHECK (public.alumnae_global_settings_is_empty());

-- ── 3. is_super_admin() / has_role() ────────────────────────────────────────
--
-- Both read user_roles_multi and were plain STABLE. Two consequences:
--
--   a) urm_self_read on user_roles_multi is
--        (user_id = auth.uid() OR is_super_admin())
--      so the function re-enters the RLS of the table it is guarding. Latent
--      only because the table is empty.
--   b) Called from policies on OTHER tables (they are referenced by ~573
--      policy expressions), they see only rows the caller can already read.
--      If user_roles_multi RLS hides the row, a genuine super admin evaluates
--      as NOT a super admin — a permissions bug that fails closed and is
--      near-impossible to trace from the application.
--
-- Bodies are unchanged; only the security context and search_path are set,
-- matching is_gw_admin_v2() / is_gw_exec_board() / is_admin().

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_multi
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  'Is the current user a super_admin in user_roles_multi? SECURITY DEFINER: '
  'without it the lookup runs under the caller''s RLS, which both recurses on '
  'user_roles_multi''s own policies and can silently answer false for a real '
  'super admin.';

CREATE OR REPLACE FUNCTION public.has_role(target text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles_multi
    WHERE user_id = auth.uid() AND role = target
  );
$$;

COMMENT ON FUNCTION public.has_role(text) IS
  'Does the current user hold this role in user_roles_multi? SECURITY DEFINER '
  'for the same reason as is_super_admin().';

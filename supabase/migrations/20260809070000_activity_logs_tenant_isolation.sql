-- Tenant-isolate activity_logs. Same defect, same shape, same fix as
-- 20260809060000_usage_tracking_tenant_isolation.sql — apply that one first.
--
-- ════════════════════════════════════════════════════════════════════════════
-- PRE-FLIGHT — RUN THIS AGAINST PRODUCTION BEFORE APPLYING
-- ════════════════════════════════════════════════════════════════════════════
--
--   SELECT policyname, permissive, cmd, qual FROM pg_policies
--   WHERE tablename = 'activity_logs';
--
-- Confirm it returns EXACTLY these three policies:
--
--   "Admins and exec board can view all activity logs"  SELECT
--       (from 20260213214220_a10a215b-baba-45b5-a0f9-cec63a1b4695.sql)
--   "Users can view their own activity logs"            SELECT   auth.uid() = user_id
--       (from 20250623162531-12fd9bcb-f5af-4d5e-9ae2-a2284a5c93b9.sql)
--   "Allow inserting activity logs"                     INSERT   WITH CHECK (true)
--       (from 20250623162531)
--
-- This table's admin policy has been dropped and recreated under FOUR different
-- names across five years (20250623162531, 20250801040039, 20250804150211,
-- 20250804150257, 20260213214220). Section 5 below drops every name this repo
-- has ever used, but if the droplet carries a fifth name applied out-of-band,
-- that policy is permissive, will survive every DROP here, and will keep
-- granting an unscoped platform-wide read of every tenant's audit trail. The
-- RESTRICTIVE policy in section 4 would still fence it to one tenant, but the
-- is_exec_board grant would silently persist. If the query returns anything
-- other than the three rows above, stop and reconcile before applying.
--
-- ════════════════════════════════════════════════════════════════════════════
-- WHAT IS WRONG
-- ════════════════════════════════════════════════════════════════════════════
--
-- activity_logs is written by the same hook as the usage-tracking tables —
-- src/hooks/useUsageTracking.ts:214 (every login) and :292 (every module exit),
-- via rpc('log_activity') — plus src/utils/activityLogger.ts and the
-- bulk-w9-email edge function. It records user_id, action_type, resource_type,
-- resource_id, a free-form details jsonb, ip_address and user_agent.
--
-- It has RLS enabled and NO tenant_id column. Its current admin SELECT policy
-- (20260213214220) is:
--
--   USING (EXISTS (SELECT 1 FROM gw_profiles p
--                  WHERE p.user_id = auth.uid()
--                    AND (p.is_admin OR p.is_super_admin OR p.is_exec_board)))
--
-- Three defects:
--
--   1. NO TENANT SCOPING. No tenant_id exists, so the policy cannot filter by
--      tenant even in principle. An admin at one tenant reads the complete audit
--      trail — logins, IP addresses, user agents, resource ids — of every member
--      of EVERY other tenant.
--   2. is_exec_board IS TREATED AS ADMIN. That is a STUDENT OFFICER flag, not a
--      staff role. Today it grants a student at any tenant the platform-wide
--      read described above. This is strictly worse than the 'instructor' grant
--      that 20260809060000 removed from the usage tables.
--   3. THE DATA IS MORE SENSITIVE THAN PAGE VIEWS. ip_address and user_agent are
--      per-login network identifiers, and details jsonb is free-form and carries
--      whatever the caller passed.
--
-- ════════════════════════════════════════════════════════════════════════════
-- WHAT THIS DOES
-- ════════════════════════════════════════════════════════════════════════════
--
--   * adds tenant_id, DEFAULT current_tenant_id()
--   * BEFORE INSERT trigger via the shared public.set_tenant_id_default()
--   * RESTRICTIVE tenant-isolation policy
--   * replaces the admin SELECT policy with public.current_user_is_tenant_admin()
--     (created in 20260809060000), which requires the admin's authority to exist
--     in the CURRENT tenant
--   * (tenant_id, created_at DESC) index matching the real queries
--
-- ADMIN READ — WHAT NARROWS AND WHAT WIDENS.
--   NARROWS: is_exec_board is dropped entirely — student officers lose this read
--     outright, at every tenant, which is the point of the migration. The grant
--     also becomes tenant-scoped, and the gw_profiles branch now requires
--     p.tenant_id = current_tenant_id(), which the old policy did not.
--   WIDENS: gw_tenant_members roles admin/director/owner/super-admin/super_admin
--     in the current tenant now qualify. Per 20260808200100, membership-granted
--     tenant admins are the common case live, so this is a real behavioural
--     change: several tenant admins who could not read their own tenant's audit
--     trail now can. Bounded by the RESTRICTIVE policy to their own tenant.
--   If a specific exec-board workflow depended on this read, give it its own
--   narrowly-scoped policy over the specific action_types it needs — do not
--   restore a platform-wide grant.
--
-- ════════════════════════════════════════════════════════════════════════════
-- log_activity() IS SECURITY DEFINER — WHAT THAT MEANS HERE
-- ════════════════════════════════════════════════════════════════════════════
--
-- public.log_activity() is SECURITY DEFINER and owned by a BYPASSRLS role, so
-- its INSERT does not go through this table's RLS at all. Two consequences:
--
--   * TENANT ATTRIBUTION STILL WORKS. Triggers and column DEFAULTs fire
--     regardless of RLS, and current_tenant_id() reads session GUCs
--     (request.headers, request.jwt.claims) that are unchanged by SECURITY
--     DEFINER. Rows written through the RPC get the correct tenant_id.
--   * IT FAILS OPEN, NOT CLOSED, UNLIKE user_page_views. Because RLS is
--     bypassed, the RESTRICTIVE WITH CHECK is never evaluated for these inserts.
--     Where a NULL current_tenant_id() causes user_page_views to reject the
--     write with 42501, here it writes a row with tenant_id = NULL — which is
--     then invisible to every non-BYPASSRLS reader. The audit trail keeps
--     accepting writes and quietly stops showing them. Watch for
--     `SELECT count(*) FROM activity_logs WHERE tenant_id IS NULL AND created_at
--     > <apply time>` being nonzero after this lands; a nonzero count means some
--     caller has no resolvable tenant.
--
-- log_activity() itself is NOT modified here. Adding an explicit tenant
-- parameter, or making it raise on a NULL tenant, is a separate decision with
-- five callers to audit.
--
-- ════════════════════════════════════════════════════════════════════════════
-- OTHER NOTES (identical reasoning to 20260809060000, see there for detail)
-- ════════════════════════════════════════════════════════════════════════════
--
--   * TRIGGER IS BEFORE INSERT ONLY. An UPDATE arm cannot repair legacy rows:
--     for UPDATE the RESTRICTIVE USING qual is evaluated on the OLD row before
--     any BEFORE trigger fires, so a NULL-tenant row can never be selected for
--     update. Nothing updates activity_logs anyway — it is append-only.
--   * TO PUBLIC is deliberate, and stricter than the house TO authenticated
--     pattern.
--   * RLS BYPASS COMES FROM OWNERSHIP, NOT FROM `SECURITY DEFINER`. The helper's
--     inner scan of gw_profiles (which has FORCE ROW LEVEL SECURITY) skips RLS
--     only because the function is owned by a BYPASSRLS role. The guard below
--     fails the migration loudly if it is applied as anything else.
--   * EXISTING ROWS KEEP tenant_id = NULL and become invisible to every
--     non-BYPASSRLS caller the moment this lands. That closes the leak without a
--     backfill that could mis-attribute one tenant's audit trail to another. An
--     optional backfill is at the bottom.
--
-- Existing consumers that will show an empty list for historical rows after
-- this lands: src/hooks/useActivityLogs.ts:38, src/hooks/useAdminPayments.ts:142,
-- src/components/member-view/dashboards/AdminDashboard.tsx:170,
-- src/components/member-view/dashboards/SuperAdminDashboard.tsx:437.
-- They repopulate from live traffic; none of them needs a code change.

BEGIN;

-- ── 0. ownership guard ──────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'apply as supabase_admin/postgres: helper functions must be owned by a BYPASSRLS role';
  END IF;
END $$;

-- ── 1. the shared tenant-scoped admin helper must already exist ─────────────
--
-- Created by 20260809060000. Asserted rather than redefined, so the two
-- migrations cannot drift apart.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'current_user_is_tenant_admin' AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'public.current_user_is_tenant_admin() is missing — apply 20260809060000_usage_tracking_tenant_isolation.sql first';
  END IF;
END $$;

-- ── 2. tenant_id ────────────────────────────────────────────────────────────

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT public.current_tenant_id();

-- Deliberately NOT NOT-NULL: historical rows are unattributed, and log_activity()
-- bypasses RLS so a NOT NULL here would turn a NULL-tenant session into a hard
-- 23502 failure inside every caller of the RPC rather than a quiet gap.

-- ── 3. fill on write ────────────────────────────────────────────────────────

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

DROP TRIGGER IF EXISTS activity_logs_fill_tenant ON public.activity_logs;
CREATE TRIGGER activity_logs_fill_tenant
  BEFORE INSERT ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

-- ── 4. RESTRICTIVE tenant isolation ─────────────────────────────────────────

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.activity_logs;
CREATE POLICY tenant_isolation_restrict
  ON public.activity_logs
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- ── 5. re-scope the admin read, drop is_exec_board ──────────────────────────
--
-- Every name this policy has held in repo history. See the pre-flight note.

DROP POLICY IF EXISTS "Admins and exec board can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_admin_select ON public.activity_logs;
CREATE POLICY activity_logs_admin_select
  ON public.activity_logs FOR SELECT
  USING (public.current_user_is_tenant_admin());

-- "Users can view their own activity logs" (auth.uid() = user_id) and
-- "Allow inserting activity logs" (WITH CHECK (true)) are left alone. The
-- RESTRICTIVE policy ANDs onto both: own-row reads are now also same-tenant, and
-- the permissive `true` insert check becomes `true AND tenant match`.

-- ── 6. index matching the real queries ──────────────────────────────────────
--
-- useActivityLogs.ts:38 and AdminDashboard.tsx:170 both do
-- .select(...).order('created_at', desc).limit(N) with NO user_id predicate, so
-- the existing idx_activity_logs_created_at now has to be walked across all
-- tenants and filtered. A (tenant_id, created_at DESC) index serves the shape
-- directly.

CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_created
  ON public.activity_logs (tenant_id, created_at DESC);

COMMENT ON COLUMN public.activity_logs.tenant_id IS
  'Tenant that owns this row. NULL on rows written before 20260809070000; those are invisible to every non-BYPASSRLS caller by design. log_activity() is SECURITY DEFINER and bypasses RLS, so a NULL current_tenant_id() writes a NULL here rather than raising — check for new NULL rows after deploy.';

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────────────────
-- OPTIONAL BACKFILL — READ ALL OF THIS. NOT PART OF THE MIGRATION.
--
-- Same caveats as 20260809060000's backfill, and they apply with more force
-- here because this is an audit trail: a mis-attributed row is not just a wrong
-- chart, it is a wrong answer to "who did this, and where".
--
--   -- MUST be run as supabase_admin / postgres. See caveat 2.
--   BEGIN;
--   UPDATE public.activity_logs l
--      SET tenant_id = p.tenant_id
--     FROM public.gw_profiles p
--    WHERE p.user_id = l.user_id
--      AND l.tenant_id IS NULL
--      AND p.tenant_id IS NOT NULL
--      AND l.created_at >= '2026-01-01' AND l.created_at < '2026-02-01';  -- one window at a time
--   -- inspect the count, then COMMIT or ROLLBACK
--   COMMIT;
--
--   1. IT ATTRIBUTES BY CURRENT HOME TENANT, WHICH IS WRONG FOR MOVERS. A member
--      who was in tenant A and is now in B has their A-era audit trail relabelled
--      to B.
--   2. IT MUST RUN AS A BYPASSRLS ROLE, OR IT LIES. Run as `authenticated`, the
--      RESTRICTIVE policy hides every NULL-tenant row from the UPDATE's own scan;
--      the statement matches zero rows and REPORTS SUCCESS. UPDATE 0 here means
--      "you are the wrong role", not "nothing to do".
--   3. THE PLATFORM OWNER IS THE WORST CASE. Their gw_profiles.tenant_id is
--      'main' and they act on every tenant's subdomain, so this relabels their
--      entire cross-tenant admin trail as 'main' — the same bug class as
--      20260718020000_current_tenant_id_platform_owner_sync.sql. For an audit
--      table this is the single most misleading possible outcome: the owner's
--      actions against tenant X would read as actions against 'main'. Exclude
--      the owner explicitly.
--   4. IT IS UNBATCHED OVER A HOT TABLE. activity_logs takes a row on every
--      login and every module exit. Batch by created_at window, or take a
--      maintenance window.
--   5. SOME ROWS CAN NEVER BE ATTRIBUTED. Rows with a NULL user_id (the column
--      is nullable and log_activity accepts NULL), rows whose author has a NULL
--      gw_profiles.tenant_id, and rows whose profile row is gone stay NULL and
--      invisible. Do not follow this with SET NOT NULL without checking what is
--      left.
-- ────────────────────────────────────────────────────────────────────────────

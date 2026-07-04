-- Tenant isolation for message-groups tables (security fix, found 2026-07-04).
--
-- gw_message_groups and gw_group_members had permissive USING(true)-style
-- SELECT policies and no tenant scoping: any authenticated user could read
-- every tenant's groups, and (via gw_group_members) every tenant's group
-- memberships too. UI containment shipped in an earlier plan; this is the
-- real fix, matching the established tenant-isolation pattern used for
-- notification_sounds / gw_drum_zone_config / gw_tenant_nav_prefs
-- (20260701000000 / 20260701000010 / 20260701000030): add tenant_id,
-- backfill, DEFAULT + BEFORE INSERT trigger to fill it from the JWT claim,
-- and a RESTRICTIVE tenant_isolation_restrict policy that ANDs with every
-- existing permissive policy so cross-tenant rows are never visible or
-- writable regardless of role.
--
-- Audit note (full policy inventory in .superpowers/sdd/task-1-report.md):
-- gw_group_members also carries a "System can manage memberships" policy
-- (USING (true) WITH CHECK (true), FOR ALL, no TO clause => applies to
-- every role including anon) added in migration 20251128225915 for an
-- unrelated course-study-groups feature (gw_groups) that accidentally
-- reuses this same physical table via a no-op "CREATE TABLE IF NOT
-- EXISTS gw_group_members". That policy was never dropped and is an
-- unscoped bypass; it is dropped below. NOTE: course-study-group
-- membership rows have group_id values pointing at gw_groups.id, not
-- gw_message_groups.id, so the new tenant_isolation_restrict policy's
-- EXISTS(...gw_message_groups...) check can never match those rows —
-- any non-SECURITY-DEFINER read/write of course-study-group membership
-- rows is now blocked too. That dual-use-table issue predates this
-- migration and is out of scope for message-groups tenant isolation;
-- flagged in the report for follow-up.

-- ── Add tenant_id to gw_message_groups ────────────────────────────────

ALTER TABLE public.gw_message_groups
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Backfill from any member's profile tenant; groups with no members (or
-- whose members have no tenant_id yet) fall back to the main tenant —
-- same fallback used by 20260701000010/20260701000030. current_tenant_id()
-- reads a request-scoped JWT claim that is NOT set during migration
-- execution, so (unlike the DEFAULT below, which runs at request time) it
-- cannot be used as the backfill fallback — it would leave tenant_id NULL
-- and the subsequent SET NOT NULL would fail.
UPDATE public.gw_message_groups g
SET tenant_id = COALESCE(
  (SELECT p.tenant_id FROM public.gw_group_members m
     JOIN public.gw_profiles p ON p.user_id = m.user_id
    WHERE m.group_id = g.id AND p.tenant_id IS NOT NULL
    LIMIT 1),
  (SELECT id FROM public.gw_tenants WHERE slug = 'main')
)
WHERE g.tenant_id IS NULL;

ALTER TABLE public.gw_message_groups
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();

ALTER TABLE public.gw_message_groups
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS gw_message_groups_tenant_id_idx
  ON public.gw_message_groups (tenant_id);

-- ── BEFORE INSERT trigger to fill tenant_id from JWT ──────────────────

CREATE OR REPLACE FUNCTION public.gw_message_groups_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_message_groups_fill_tenant_trg ON public.gw_message_groups;
CREATE TRIGGER gw_message_groups_fill_tenant_trg
  BEFORE INSERT ON public.gw_message_groups
  FOR EACH ROW EXECUTE FUNCTION public.gw_message_groups_fill_tenant();

-- ── RLS: gw_message_groups ─────────────────────────────────────────────
-- Drop the permissive USING(true)-style SELECT policies (live via
-- 20250822005704 "simple_view_all_groups" and 20250824025357 / refined in
-- 20250824025519 "Everyone can view active message groups"). Every other
-- existing policy on this table (insert/update/manage, admin/exec-board
-- scoped) is left in place — it now composes with the RESTRICTIVE policy
-- below instead of being the only gate.

DROP POLICY IF EXISTS "simple_view_all_groups" ON public.gw_message_groups;
DROP POLICY IF EXISTS "Everyone can view active message groups" ON public.gw_message_groups;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_message_groups;
CREATE POLICY tenant_isolation_restrict
  ON public.gw_message_groups
  AS RESTRICTIVE
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Replaces the two dropped permissive SELECTs: same "any signed-in user
-- can see active groups" read behavior, now composed with the RESTRICTIVE
-- tenant check above so it only ever surfaces the caller's own tenant.
DROP POLICY IF EXISTS groups_select ON public.gw_message_groups;
CREATE POLICY groups_select
  ON public.gw_message_groups
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS service_full_groups ON public.gw_message_groups;
CREATE POLICY service_full_groups
  ON public.gw_message_groups
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── RLS: gw_group_members ──────────────────────────────────────────────
-- Drop the permissive USING(true)-style policies (live via
-- 20250822005704 "simple_view_own_membership" and 20250824025357 /
-- refined in 20250824025519 "Users can view group memberships"), plus
-- "System can manage memberships" (audit finding above — unscoped
-- USING(true)/WITH CHECK(true) FOR ALL, no TO clause). Every other
-- existing policy (admin/exec-board manage, direct-message-group insert)
-- is left in place and now composes with the RESTRICTIVE policy below.

DROP POLICY IF EXISTS "simple_view_own_membership" ON public.gw_group_members;
DROP POLICY IF EXISTS "Users can view group memberships" ON public.gw_group_members;
DROP POLICY IF EXISTS "System can manage memberships" ON public.gw_group_members;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_group_members;
CREATE POLICY tenant_isolation_restrict
  ON public.gw_group_members
  AS RESTRICTIVE
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_message_groups g
       WHERE g.id = group_id AND g.tenant_id = public.current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_message_groups g
       WHERE g.id = group_id AND g.tenant_id = public.current_tenant_id()
    )
  );

-- Replaces the two dropped permissive SELECTs: same "any signed-in user
-- can see membership rows" read behavior, now composed with the
-- RESTRICTIVE group-tenant check above.
DROP POLICY IF EXISTS members_select ON public.gw_group_members;
CREATE POLICY members_select
  ON public.gw_group_members
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS service_full_members ON public.gw_group_members;
CREATE POLICY service_full_members
  ON public.gw_group_members
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

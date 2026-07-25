-- Auto-enroll a tenant's creator as its owner in gw_tenant_members.
--
-- Historical shape: gw_tenants has no owner_id column, and the signup
-- trigger (handle_new_user_profile) only enrolls a user in the tenant
-- they signed up under. A super-admin who provisioned additional
-- tenants (e.g. Kevin creating "kevinsworld" while signed into main)
-- never got a gw_tenant_members row for those extra tenants → they
-- didn't appear in the my_tenants RPC → the avatar dropdown's
-- "Switch organization" list stayed hidden → no way to jump between
-- worlds in the UI at all.
--
-- Fix in two parts:
--
-- 1. Trigger on gw_tenants INSERT: if auth.uid() is set (i.e., the
--    insert came from an authenticated user, not a service_role
--    backfill), enrol that user as owner of the new tenant.
--    SECURITY DEFINER so the write bypasses the target table's RLS;
--    scoped strictly to auth.uid() so there's no privilege escalation.
--
-- 2. One-time backfill for Kevin's kevinsworld membership — the only
--    case reported so far. If other tenants have orphan-owner rows
--    they'll need their own backfill; this migration doesn't try to
--    guess owners for arbitrary tenants (there's no owner column to
--    read from), and we do NOT want to silently make random people
--    owners of tenants they merely created rows in.

CREATE OR REPLACE FUNCTION public.enroll_creator_as_tenant_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
    VALUES (auth.uid(), NEW.id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_tenants_enroll_owner ON public.gw_tenants;
CREATE TRIGGER gw_tenants_enroll_owner
  AFTER INSERT ON public.gw_tenants
  FOR EACH ROW EXECUTE FUNCTION public.enroll_creator_as_tenant_owner();

-- Backfill: Kevin as owner of Kevin's World (slug='kevin', not
-- 'kevinsworld' — the tenant was provisioned with a bare slug).
-- Idempotent — ON CONFLICT DO NOTHING so re-runs are safe. Scoped by
-- email + slug so accidentally applying this migration on a fresh /
-- empty database is also a no-op (nothing to match).
INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
SELECT u.id, t.id, 'owner'
FROM auth.users u, public.gw_tenants t
WHERE u.email = 'kpj64110@gmail.com'
  AND t.slug = 'kevin'
ON CONFLICT DO NOTHING;

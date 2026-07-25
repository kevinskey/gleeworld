-- Super-admins always get at least role='admin' in every tenant they
-- join. A platform super-admin (gw_profiles.is_super_admin = true) has
-- no meaningful "member" or "student" mode; if they're in a tenant,
-- they need to be able to run it. Previously this had to be set
-- manually per membership (Kevin was 'member' in lykehouse until we
-- bumped him by hand); this trigger + backfill makes it automatic.
--
-- Behavior:
--   - Trigger BEFORE INSERT OR UPDATE on gw_tenant_members: if the
--     user is a super-admin AND the incoming role is weaker than
--     'admin' (member/student/none), rewrite it to 'admin'. Roles
--     already at or above admin (admin/owner/super_admin) are left
--     alone so an explicit "owner" isn't demoted.
--   - Backfill any existing rows the same way so the current world
--     state matches what the trigger would produce for new inserts.
--
-- Non-super-admins are untouched — their memberships insert with
-- whatever role the caller passed (student, fan, admin, etc.), same
-- as before.

CREATE OR REPLACE FUNCTION public.promote_super_admin_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_super boolean;
BEGIN
  SELECT COALESCE(is_super_admin, false)
    INTO v_is_super
  FROM public.gw_profiles
  WHERE user_id = NEW.user_id;

  IF v_is_super AND COALESCE(NEW.role, '') NOT IN ('admin', 'owner', 'super_admin') THEN
    NEW.role := 'admin';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_tenant_members_promote_super_admin ON public.gw_tenant_members;
CREATE TRIGGER gw_tenant_members_promote_super_admin
  BEFORE INSERT OR UPDATE OF role ON public.gw_tenant_members
  FOR EACH ROW EXECUTE FUNCTION public.promote_super_admin_membership();

-- Backfill: existing super-admin memberships weaker than 'admin' get
-- bumped to 'admin'. Runs once at migration time; the trigger keeps
-- the invariant afterwards.
UPDATE public.gw_tenant_members m
   SET role = 'admin'
  FROM public.gw_profiles p
 WHERE m.user_id = p.user_id
   AND p.is_super_admin = true
   AND COALESCE(m.role, '') NOT IN ('admin', 'owner', 'super_admin');

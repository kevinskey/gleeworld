-- The platform mints a role it does not honour.
--
-- enroll_creator_as_tenant_owner fires on gw_tenants INSERT and records the
-- creator as gw_tenant_members.role = 'owner'. It touches nothing else — no
-- profile flags, no other membership. Meanwhile current_user_is_admin() reads
-- ONLY gw_profiles:
--
--   is_admin OR is_super_admin OR role IN ('admin','super-admin')
--
-- gw_profiles.role never holds 'owner' (verified in production: student, fan,
-- super-admin, staff, admin, alumna, parent, alumni). So a user who creates a
-- tenant owns it and is an admin by NO check at all. They would be refused by
-- current_user_is_admin(), by the 12 RLS policies that call it, and by
-- admin_create_user and delete_user_and_data.
--
-- The edge-function half of this was fixed in #559, where nine functions
-- rejected tenant_role='owner'. This is the database half.
--
-- FIX: treat an owner of the CURRENT tenant as an admin.
--
-- Deliberately tenant-scoped. Owning tenant A must not confer admin in tenant
-- B, so the membership row is matched against current_tenant_id() rather than
-- accepting any owner row.
--
-- Deliberately ONLY 'owner'. Membership roles 'admin'/'super-admin' are not
-- added here: that would grant profile-level admin to tenant-admins who
-- currently do not have it, which is a much larger behavioural change than the
-- bug being fixed and deserves its own decision.
--
-- Also deliberately NOT fixed by making the trigger set gw_profiles.is_admin.
-- gw_profiles is per-USER, not per-membership, so that would make a tenant
-- creator an admin everywhere their profile is evaluated — including tenants
-- where they are only a student. Scoping the grant here keeps it contained.
--
-- No recursion: gw_tenant_members has RLS DISABLED and no policy on it
-- references current_user_is_admin, and current_tenant_id() is SECURITY
-- DEFINER. Verified before writing this.
--
-- Blast radius today: exactly one 'owner' row exists platform-wide, and that
-- user already passes via is_super_admin. So this changes no current
-- behaviour — it only stops the next tenant creator being locked out.

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin'))
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_tenant_members m
    WHERE m.user_id = auth.uid()
      AND m.role = 'owner'
      AND m.tenant_id = current_tenant_id()
  );
$function$;

COMMENT ON FUNCTION public.current_user_is_admin() IS
  'True for profile-level admins, and for the OWNER of the current tenant. '
  'Owner is scoped to current_tenant_id(): owning one tenant confers nothing '
  'in another. enroll_creator_as_tenant_owner mints that role, so without '
  'this a tenant creator was an admin by no check at all.';

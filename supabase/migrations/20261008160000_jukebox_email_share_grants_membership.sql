-- Jukebox email shares make the recipient a member of the sharing tenant.
--
-- Incident (2026-10-08): Kevin shared a Yo Player playlist from yo-doc.com
-- (tenant `kevin`) to an email address whose account belongs to another
-- tenant. The recipient saw nothing. Every Jukebox table sits behind
-- RESTRICTIVE `tenant_id = current_tenant_id()`, and current_tenant_id()
-- only honours the site's x-tenant-slug for MEMBERS of that tenant, so on
-- yo-doc.com the recipient was scoped to their home tenant and every share
-- row in `kevin` was invisible. (AuthContext also bounced them off
-- yo-doc.com to their home site; see the matching AuthContext change.)
--
-- Kevin's decision (approved 2026-10-08): sharing by email should be enough.
-- An email share now grants a `fan` membership in the share's tenant — the
-- role a public signup on that site gets (handle_new_user_profile), and the
-- lowest one. It does NOT change the person's home or active tenant.
--
--   1. On share insert / un-revoke / email change: grant to the confirmed
--      account with that address, if one exists.
--   2. On account confirmation (signup or email change): grant for every
--      live email share already waiting for that address, so "share first,
--      sign up later" works.
--   3. Backfill existing live email shares.
--
-- Only CONFIRMED addresses are granted, so nobody can claim a share by
-- registering someone else's email. Revoking a share does not remove the
-- membership: other access may depend on it, and the playlist itself is
-- hidden again by the revoked_at check in RLS.

CREATE OR REPLACE FUNCTION public.gw_grant_share_membership(p_email text, p_tenant uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
  SELECT u.id, p_tenant, 'fan'
    FROM auth.users u
   WHERE p_email IS NOT NULL
     AND p_tenant IS NOT NULL
     AND lower(u.email) = lower(trim(p_email))
     AND u.email_confirmed_at IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.gw_tenant_members m
        WHERE m.user_id = u.id AND m.tenant_id = p_tenant)
  ON CONFLICT DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.gw_grant_share_membership(text, uuid) FROM public, anon, authenticated;

-- 1. Share side -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gw_jps_grant_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.share_type = 'email' AND NEW.revoked_at IS NULL THEN
    PERFORM public.gw_grant_share_membership(NEW.invited_email, NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.gw_jps_grant_membership() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS gw_jps_grant_membership ON public.gw_jukebox_playlist_shares;
CREATE TRIGGER gw_jps_grant_membership
  AFTER INSERT OR UPDATE OF invited_email, revoked_at, share_type
  ON public.gw_jukebox_playlist_shares
  FOR EACH ROW EXECUTE FUNCTION public.gw_jps_grant_membership();

-- 2. Account side -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gw_grant_pending_share_memberships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;
  -- A share lookup must never break signup or sign-in.
  BEGIN
    INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
    SELECT DISTINCT NEW.id, s.tenant_id, 'fan'
      FROM public.gw_jukebox_playlist_shares s
     WHERE s.share_type = 'email'
       AND s.revoked_at IS NULL
       AND lower(s.invited_email) = lower(NEW.email)
       AND NOT EXISTS (
         SELECT 1 FROM public.gw_tenant_members m
          WHERE m.user_id = NEW.id AND m.tenant_id = s.tenant_id)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'gw_grant_pending_share_memberships: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.gw_grant_pending_share_memberships() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS gw_grant_pending_share_memberships ON auth.users;
CREATE TRIGGER gw_grant_pending_share_memberships
  AFTER INSERT OR UPDATE OF email_confirmed_at, email
  ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.gw_grant_pending_share_memberships();

-- 3. Backfill ---------------------------------------------------------------
INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
SELECT DISTINCT u.id, s.tenant_id, 'fan'
  FROM public.gw_jukebox_playlist_shares s
  JOIN auth.users u ON lower(u.email) = lower(s.invited_email)
 WHERE s.share_type = 'email'
   AND s.revoked_at IS NULL
   AND u.email_confirmed_at IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.gw_tenant_members m
      WHERE m.user_id = u.id AND m.tenant_id = s.tenant_id)
ON CONFLICT DO NOTHING;

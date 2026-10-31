-- Every GleeWorld (tenant 'main') member is also a Yo-Doc (tenant 'kevin')
-- member, and a tenant's People page shows its MEMBERS, not just the
-- profiles homed there.
--
-- Kevin, 2026-10-31: "all members from gleeworld should be members in yo
-- doc" / "fix it completely". Babette (an existing GleeWorld account) could
-- not see the yo-doc.com music library because she had no gw_tenant_members
-- row for 'kevin': current_tenant_id() ignored the yo-doc header and the
-- RESTRICTIVE tenant policies hid every score. Natasha, invited from
-- yo-doc.com, got a 'kevin' membership but never appeared on yo-doc's People
-- page, because that page listed gw_profiles — which is UNIQUE(user_id) with
-- ONE home tenant_id, and RLS on it is `tenant_id = current_tenant_id()`.
-- An account can be a member of many tenants but homed on only one, so a
-- roster built from profiles can never show cross-tenant members.
--
-- 1. Trigger + backfill: each 'main' member (not fan/vip — those are the
--    public gleeworld.org audience) gets a 'member' row on 'kevin'. Existing
--    'kevin' rows are never touched, so nobody is downgraded.
-- 2. gw_tenant_roster(): the current tenant's members joined to their
--    profiles, for tenant admins. SECURITY DEFINER because the profile rows
--    of members homed elsewhere are unreadable under gw_profiles RLS.
-- 3. gw_update_tenant_member(): role / admin / disabled edits from the People
--    page, scoped to the current tenant's membership row. Mirrors into
--    gw_profiles only when the profile is homed in this tenant, preserving
--    the pre-existing behaviour for native members.
--
-- Membership is checked live per request by current_tenant_id(), so no
-- sign-out is needed — a page reload on yo-doc.com is enough.

BEGIN;

-- ── 1. Mirror main → kevin ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.gw_mirror_main_membership_to_yodoc()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_main  uuid;
  v_kevin uuid;
BEGIN
  SELECT id INTO v_main  FROM public.gw_tenants WHERE slug = 'main';
  SELECT id INTO v_kevin FROM public.gw_tenants WHERE slug = 'kevin';
  IF v_main IS NULL OR v_kevin IS NULL THEN RETURN NEW; END IF;

  IF NEW.tenant_id = v_main
     AND lower(coalesce(NEW.role, '')) NOT IN ('fan', 'vip') THEN
    INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
    VALUES (NEW.user_id, v_kevin, 'member')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.gw_mirror_main_membership_to_yodoc() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_mirror_main_membership_to_yodoc ON public.gw_tenant_members;
CREATE TRIGGER trg_mirror_main_membership_to_yodoc
  AFTER INSERT ON public.gw_tenant_members
  FOR EACH ROW EXECUTE FUNCTION public.gw_mirror_main_membership_to_yodoc();

INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
SELECT DISTINCT m.user_id, k.id, 'member'
FROM public.gw_tenant_members m
JOIN public.gw_tenants main_t ON main_t.id = m.tenant_id AND main_t.slug = 'main'
JOIN public.gw_tenants k ON k.slug = 'kevin'
WHERE lower(coalesce(m.role, '')) NOT IN ('fan', 'vip')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ── 2. Who may manage the current tenant's roster ───────────────────────────
-- Platform super admins; tenant leadership by membership role (both
-- super-admin spellings, admin, owner, director — see src/lib/auth/tenantRoles.ts);
-- or a profile-flag admin who is at least a member here. Never a flag-admin
-- of some OTHER tenant (the 2026-10-02 cross-tenant class of bug).

CREATE OR REPLACE FUNCTION public.gw_can_manage_tenant_roster()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.gw_profiles p
             WHERE p.user_id = auth.uid() AND p.is_super_admin = true)
    OR EXISTS (
      SELECT 1 FROM public.gw_tenant_members m
       WHERE m.user_id = auth.uid()
         AND m.tenant_id = public.current_tenant_id()
         AND (
           lower(m.role) IN ('super_admin','super-admin','admin','owner','director')
           OR EXISTS (SELECT 1 FROM public.gw_profiles p
                       WHERE p.user_id = auth.uid() AND p.is_admin = true)
         )
    )
  );
$$;
REVOKE ALL ON FUNCTION public.gw_can_manage_tenant_roster() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_can_manage_tenant_roster() TO authenticated;

-- ── 3. The roster ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.gw_tenant_roster()
RETURNS TABLE (
  user_id        uuid,
  email          text,
  full_name      text,
  role           text,
  tenant_role    text,
  is_admin       boolean,
  is_super_admin boolean,
  disabled       boolean,
  avatar_url     text,
  phone_number   text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.gw_can_manage_tenant_roster() THEN
    RAISE EXCEPTION 'not allowed to view this workspace''s people' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.email, p.full_name, p.role, m.role AS tenant_role,
         p.is_admin, p.is_super_admin, p.disabled, p.avatar_url, p.phone_number
  FROM public.gw_tenant_members m
  JOIN public.gw_profiles p ON p.user_id = m.user_id
  WHERE m.tenant_id = public.current_tenant_id()
  ORDER BY p.full_name NULLS LAST, p.email;
END;
$$;
REVOKE ALL ON FUNCTION public.gw_tenant_roster() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_tenant_roster() TO authenticated;

-- ── 4. Edits from the People page ───────────────────────────────────────────
-- p_role is the People page's role picker (member / instructor / admin /
-- fan / alumni). "Workspace admin" checked means membership role 'admin'.

CREATE OR REPLACE FUNCTION public.gw_update_tenant_member(
  p_user_id  uuid,
  p_role     text,
  p_is_admin boolean,
  p_disabled boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant      uuid := public.current_tenant_id();
  v_target_m    public.gw_tenant_members%ROWTYPE;
  v_target_p    public.gw_profiles%ROWTYPE;
  v_caller_super boolean;
  v_new_role    text;
BEGIN
  IF NOT public.gw_can_manage_tenant_roster() THEN
    RAISE EXCEPTION 'not allowed to manage this workspace''s people' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NULL OR lower(p_role) NOT IN ('member','instructor','admin','fan','alumni') THEN
    RAISE EXCEPTION 'unknown role %', p_role USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_target_m FROM public.gw_tenant_members
   WHERE user_id = p_user_id AND tenant_id = v_tenant;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'that person is not a member of this workspace' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_target_p FROM public.gw_profiles WHERE user_id = p_user_id;

  SELECT coalesce(p.is_super_admin, false) INTO v_caller_super
    FROM public.gw_profiles p WHERE p.user_id = auth.uid();

  -- Super admins (platform flag or tenant super-admin/owner role) can only be
  -- changed by a platform super admin. This UI never escalates anyone to
  -- super admin.
  IF NOT v_caller_super AND (
       coalesce(v_target_p.is_super_admin, false)
       OR lower(coalesce(v_target_m.role, '')) IN ('super_admin','super-admin','owner')
     ) THEN
    RAISE EXCEPTION 'only a platform super admin can change this person' USING ERRCODE = '42501';
  END IF;

  v_new_role := CASE WHEN p_is_admin THEN 'admin' ELSE lower(p_role) END;
  -- Keep owner / super-admin membership roles as they are.
  IF lower(coalesce(v_target_m.role, '')) NOT IN ('super_admin','super-admin','owner') THEN
    UPDATE public.gw_tenant_members SET role = v_new_role
     WHERE user_id = p_user_id AND tenant_id = v_tenant;
  END IF;

  -- `disabled` is per account (blocks sign-in everywhere), exactly as the
  -- People page has always written it.
  UPDATE public.gw_profiles SET disabled = p_disabled, updated_at = now()
   WHERE user_id = p_user_id;

  -- Native members: mirror into the profile too, as before, because many
  -- surfaces still read gw_profiles.role / is_admin.
  IF v_target_p.tenant_id = v_tenant THEN
    UPDATE public.gw_profiles
       SET role = lower(p_role), is_admin = p_is_admin, updated_at = now()
     WHERE user_id = p_user_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.gw_update_tenant_member(uuid, text, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_update_tenant_member(uuid, text, boolean, boolean) TO authenticated;

COMMIT;

-- Result check: Yo-Doc members by role.
SELECT m.role, count(*) AS people
FROM public.gw_tenant_members m
JOIN public.gw_tenants t ON t.id = m.tenant_id
WHERE t.slug = 'kevin'
GROUP BY m.role
ORDER BY people DESC;

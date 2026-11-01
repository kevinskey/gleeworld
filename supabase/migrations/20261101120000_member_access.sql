-- ─────────────────────────────────────────────────────────────────────────────
-- MEMBER ACCESS — who sees what an admin shares. Defined once, here.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Kevin, 2026-11-01: "I just need people who I have invited to Yo-Doc, whether
-- they were already a member on GleeWorld or not, to be able to see the sheet
-- music and MP3s that I share with them. Any tenant who is sharing with their
-- members should be able to see what the admin has shared."
--
-- The rule, in plain words:
--
--   1. INVITED = MEMBER.   Inviting someone to a workspace gives them a row in
--      gw_tenant_members for that workspace with a member-level role. Nothing
--      else is ever consulted. Rows come from: the gw-invite-student function,
--      roster import, the GleeWorld → Yo-Doc mirror (20261031120000), and the
--      backfill in section 1 (an account homed in a workspace has a row there).
--
--      AUDIENCE ≠ MEMBER.  A public signup on a workspace's site, or a person
--      who was only sent a playlist by email (20261008160000), gets a row with
--      role 'fan'. Fans and VIPs are the audience: they see what is shared to
--      them by name or email, never what is shared with "Everyone". Section 1
--      also closes the hole where a self-signup could pick its own role.
--
--   2. MEMBER = SCOPED.    current_tenant_id() honours the site a person is on
--      (x-tenant-slug) because of that row, so every tenant-isolated table
--      shows that workspace's rows. A person can be a member of many
--      workspaces; their profile is homed in only one. That is normal.
--
--   3. SHARED = VISIBLE.   A member sees a score when a share names them:
--      everyone / this person / their class / their voice part. A member sees
--      a playlist when it is public or a share names them: everyone / staff /
--      admins / their email / their class. gw_share_reaches_me() is the one
--      definition for scores; gw_jukebox_playlist_visible() for playlists,
--      written in the same terms.
--
--   4. ADMINS OF THIS WORKSPACE SEE EVERYTHING IN IT — and only in it.
--      gw_is_admin_here() is scoped to the workspace the request is on. An
--      admin or librarian of some OTHER workspace who holds a plain membership
--      here is a member here, nothing more. (The profile-flag helpers
--      user_is_admin() / can_edit_music_library() are account-wide; they are
--      not used for listing any more.)
--
--   5. YOU SHARE WITH MEMBERS, SO THE SHARE DIALOG LISTS MEMBERS.
--      gw_share_people() returns the workspace's members joined to their
--      profiles wherever those are homed. The old picker read gw_profiles,
--      which under RLS only showed accounts homed here.
--
--   6. gw_my_access() answers "why can't X see it?" in one call.
--
-- Everything is CREATE OR REPLACE / ON CONFLICT DO NOTHING: safe to re-run.
-- Membership is checked live on every request, so no sign-out is needed; a
-- page reload is enough.

BEGIN;

-- ── 1. Membership ──────────────────────────────────────────────────────────

-- Membership roles that run a workspace or its library. Both super-admin
-- spellings exist in production data.
CREATE OR REPLACE FUNCTION public.gw_admin_roles()
RETURNS text[]
LANGUAGE sql IMMUTABLE
AS $$ SELECT ARRAY['owner','director','admin','super_admin','super-admin','librarian'] $$;

-- The caller's membership role in the workspace this request is scoped to
-- (lower-cased), or NULL when they hold no row there. If duplicate rows ever
-- exist, the most privileged wins.
CREATE OR REPLACE FUNCTION public.gw_member_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(m.role)
    FROM public.gw_tenant_members m
   WHERE m.user_id = auth.uid()
     AND m.tenant_id = public.current_tenant_id()
   ORDER BY CASE lower(m.role)
              WHEN 'owner' THEN 0 WHEN 'super_admin' THEN 1 WHEN 'super-admin' THEN 1
              WHEN 'director' THEN 2 WHEN 'admin' THEN 3 WHEN 'librarian' THEN 4
              WHEN 'staff' THEN 5 WHEN 'instructor' THEN 6 WHEN 'fan' THEN 98 WHEN 'vip' THEN 98
              ELSE 50 END
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.gw_member_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_member_role() TO authenticated;

-- A disabled account keeps no access anywhere, whatever rows it holds.
CREATE OR REPLACE FUNCTION public.gw_account_enabled()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.gw_profiles p
                      WHERE p.user_id = auth.uid() AND p.disabled = true);
$$;
REVOKE ALL ON FUNCTION public.gw_account_enabled() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_account_enabled() TO authenticated;

-- Does the caller hold ANY row here (member or audience)? This is what lets a
-- person who was sent one playlist by email see that playlist.
CREATE OR REPLACE FUNCTION public.gw_has_membership()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.gw_account_enabled()
     AND (public.gw_member_role() IS NOT NULL OR public.is_platform_owner());
$$;
REVOKE ALL ON FUNCTION public.gw_has_membership() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_has_membership() TO authenticated;

-- Is the caller a MEMBER here — invited, not just audience? "Everyone in this
-- workspace" means these people. The platform owner counts everywhere (they
-- already bypass tenant scoping in current_tenant_id()).
CREATE OR REPLACE FUNCTION public.gw_is_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.gw_account_enabled()
     AND (
       coalesce(public.gw_member_role(), 'fan') NOT IN ('fan', 'vip')
       OR public.is_platform_owner()
     );
$$;
REVOKE ALL ON FUNCTION public.gw_is_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_is_member() TO authenticated;

-- Does the caller run THIS workspace (or its library)? Scoped to the current
-- workspace on purpose: a membership role from gw_admin_roles(), or a profile
-- flagged admin / super-admin / librarian (or holding the librarian_dashboard
-- permission) whose profile is HOMED here, or the platform owner. A flag-admin
-- of another workspace is not an admin here.
CREATE OR REPLACE FUNCTION public.gw_is_admin_here()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.gw_account_enabled() AND (
    public.is_platform_owner()
    OR public.gw_member_role() = ANY (public.gw_admin_roles())
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles p
       WHERE p.user_id = auth.uid()
         AND p.tenant_id = public.current_tenant_id()
         AND (p.is_admin = true OR p.is_super_admin = true OR p.role = 'librarian'
              OR public.has_username_permission(p.email, 'librarian_dashboard'))
    )
  );
$$;
REVOKE ALL ON FUNCTION public.gw_is_admin_here() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_is_admin_here() TO authenticated;

-- Self-signup is AUDIENCE. The signup trigger used to copy a client-chosen
-- role ('member', 'student', …) from raw_user_meta_data into the membership
-- row, so anyone could POST /auth/v1/signup with {tenant_slug, role:'member'}
-- and become a member of any workspace. The membership row is now always
-- 'fan'; invitations promote it through gw_grant_membership() below (called
-- by gw-invite-student and gw-roster-import with the service role). The
-- profile row keeps the same whitelist as before — it is not an access root.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_role text;
BEGIN
  SELECT id INTO v_tenant_id
    FROM public.gw_tenants
   WHERE slug = COALESCE(NEW.raw_user_meta_data->>'tenant_slug', 'main');
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.gw_tenants WHERE slug = 'main';
  END IF;

  v_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'fan'));
  IF v_role NOT IN ('fan', 'member', 'student', 'singer', 'viewer') THEN
    v_role := 'fan';
  END IF;

  INSERT INTO public.gw_profiles (user_id, email, full_name, status, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      initcap(replace(replace(split_part(NEW.email, '@', 1), '.', ' '), '_', ' '))
    ),
    'active',
    v_role,
    v_tenant_id
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
  VALUES (NEW.id, v_tenant_id, 'fan')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Invitations grant membership. Service-role only (edge functions). Creates
-- the row, or promotes an audience row ('fan' / 'vip') to the invited role.
-- Never downgrades, never touches an existing member-level role, and never
-- grants an admin role — promotion to admin stays a deliberate act on the
-- People page (gw_update_tenant_member).
CREATE OR REPLACE FUNCTION public.gw_grant_membership(
  p_user_id   uuid,
  p_tenant_id uuid,
  p_role      text DEFAULT 'member'
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role     text := lower(coalesce(nullif(trim(p_role), ''), 'member'));
  v_existing text;
BEGIN
  IF p_user_id IS NULL OR p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'user and tenant are required' USING ERRCODE = '22023';
  END IF;
  IF v_role = ANY (public.gw_admin_roles()) OR v_role IN ('staff', 'executive') THEN
    RAISE EXCEPTION 'gw_grant_membership never grants %; promote on the People page', v_role
      USING ERRCODE = '42501';
  END IF;

  SELECT lower(m.role) INTO v_existing
    FROM public.gw_tenant_members m
   WHERE m.user_id = p_user_id AND m.tenant_id = p_tenant_id
   LIMIT 1;

  IF v_existing IS NULL THEN
    INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
    VALUES (p_user_id, p_tenant_id, v_role)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
    RETURN v_role;
  END IF;

  IF v_existing IN ('fan', 'vip') AND v_role NOT IN ('fan', 'vip') THEN
    UPDATE public.gw_tenant_members SET role = v_role
     WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
    RETURN v_role;
  END IF;

  RETURN v_existing;
END;
$$;
REVOKE ALL ON FUNCTION public.gw_grant_membership(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.gw_grant_membership(uuid, uuid, text) TO service_role;
  END IF;
END $$;

-- Safety net for rule 1: an account HOMED in a workspace holds a row there.
-- Legacy accounts exist whose profile names a tenant but which never got a
-- membership row. The row carries the profile's role mapped into the
-- membership role-space; admin roles only when the matching profile flag is
-- set. Skips disabled / non-active profiles and placeholder profiles with no
-- auth user (the FK would abort the whole migration). Existing rows are never
-- changed. (Each new 'main' row also fires the main → kevin mirror trigger.)
INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
SELECT p.user_id, p.tenant_id,
       CASE lower(coalesce(p.role, ''))
         WHEN 'fan'         THEN 'fan'
         WHEN 'vip'         THEN 'fan'
         WHEN 'viewer'      THEN 'fan'
         WHEN 'auditioner'  THEN 'fan'
         WHEN 'student'     THEN 'member'
         WHEN 'singer'      THEN 'member'
         WHEN 'instructor'  THEN 'instructor'
         WHEN 'alumni'      THEN 'alumni'
         WHEN 'alumna'      THEN 'alumni'
         WHEN 'graduate'    THEN 'alumni'
         WHEN 'graduates'   THEN 'alumni'
         WHEN 'librarian'   THEN 'librarian'
         WHEN 'admin'       THEN CASE WHEN p.is_admin OR p.is_super_admin THEN 'admin' ELSE 'member' END
         WHEN 'super_admin' THEN CASE WHEN p.is_super_admin THEN 'super_admin' ELSE 'member' END
         WHEN 'super-admin' THEN CASE WHEN p.is_super_admin THEN 'super_admin' ELSE 'member' END
         ELSE 'member'
       END
  FROM public.gw_profiles p
 WHERE p.user_id IS NOT NULL
   AND p.tenant_id IS NOT NULL
   AND coalesce(p.disabled, false) = false
   AND coalesce(p.status, 'active') IN ('active', 'approved')
   AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id)
   AND EXISTS (SELECT 1 FROM public.gw_tenants t WHERE t.id = p.tenant_id)
   AND NOT EXISTS (
     SELECT 1 FROM public.gw_tenant_members m
      WHERE m.user_id = p.user_id AND m.tenant_id = p.tenant_id)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ── 2. Sheet music: does this share reach me? ──────────────────────────────

-- The ONE definition of "a score shared like this is visible to the caller".
-- Arguments are the four share columns on gw_sheet_music. SECURITY DEFINER
-- so the voice-part lane can read the caller's profile wherever it is homed.
-- Audience (fans) are reached only when named in person; members by any lane.
CREATE OR REPLACE FUNCTION public.gw_share_reaches_me(
  p_everyone    boolean,
  p_users       uuid[],
  p_courses     uuid[],
  p_voice_parts text[]
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.gw_has_membership() AND (
    auth.uid() = ANY (coalesce(p_users, '{}'::uuid[]))
    OR (public.gw_is_member() AND (
      coalesce(p_everyone, false)
      OR EXISTS (
        SELECT 1 FROM public.gw_course_enrollments ce
         WHERE ce.course_id = ANY (coalesce(p_courses, '{}'::uuid[]))
           AND ce.enrollment_status = 'enrolled'
           AND (ce.user_id = auth.uid() OR ce.student_profile_id = auth.uid())
      )
      OR EXISTS (
        SELECT 1 FROM public.gw_profiles p
         WHERE p.user_id = auth.uid()
           AND p.voice_part = ANY (coalesce(p_voice_parts, '{}'::text[]))
      )
    ))
  );
$$;
REVOKE ALL ON FUNCTION public.gw_share_reaches_me(boolean, uuid[], uuid[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_share_reaches_me(boolean, uuid[], uuid[], text[]) TO authenticated;

-- The Scores tab reads this view. Three lanes and nothing else:
--   admins / librarians OF THIS WORKSPACE → everything in it
--   the uploader                          → their own scores
--   members                               → what has been shared with them
-- The view filters by the current workspace itself, in addition to the base
-- table's RESTRICTIVE tenant policy (security_invoker keeps that in force), so
-- a member only ever sees the workspace they are on even if that policy were
-- ever missing. Dropped and recreated so the column list always matches.
DROP VIEW IF EXISTS public.gw_sheet_music_browse;
CREATE VIEW public.gw_sheet_music_browse
WITH (security_invoker = on) AS
SELECT sm.*
  FROM public.gw_sheet_music sm
 WHERE sm.is_archived = false
   AND sm.tenant_id = public.current_tenant_id()
   AND (
     public.gw_is_admin_here()
     OR sm.created_by = auth.uid()
     OR public.gw_share_reaches_me(
          sm.shared_with_members,
          sm.shared_with_users,
          sm.shared_with_courses,
          sm.shared_with_voice_parts)
   );
REVOKE ALL ON public.gw_sheet_music_browse FROM PUBLIC, anon;
GRANT SELECT ON public.gw_sheet_music_browse TO authenticated;

-- ── 3. Jukebox (MP3s): who sees a playlist ─────────────────────────────────

-- Same rule, same words. Admins of this workspace see all. Anyone holding a
-- row sees a playlist that is public here or shared to their (confirmed)
-- email address. Members also see playlists shared with everyone, with staff
-- or admins (by their role), or with a class they are enrolled in. Tracks
-- inherit from playlists (jukebox_tracks_shared_read, 20261005150000).
CREATE OR REPLACE FUNCTION public.gw_jukebox_playlist_visible(p_playlist uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.gw_is_admin_here()
  OR (
    public.gw_has_membership()
    AND (
      EXISTS (
        SELECT 1 FROM public.gw_jukebox_playlists pl
         WHERE pl.id = p_playlist
           AND pl.is_public
           AND pl.tenant_id = public.current_tenant_id()
      )
      OR EXISTS (
        SELECT 1 FROM public.gw_jukebox_playlist_shares s
         WHERE s.playlist_id = p_playlist
           AND s.tenant_id = public.current_tenant_id()
           AND s.revoked_at IS NULL
           AND (
             (s.share_type = 'email' AND EXISTS (
                SELECT 1 FROM auth.users u
                 WHERE u.id = auth.uid()
                   AND u.email_confirmed_at IS NOT NULL
                   AND lower(u.email) = lower(s.invited_email)))
             OR (public.gw_is_member() AND (
                  (s.share_type = 'role' AND s.target_role = 'member')
                  OR (s.share_type = 'role' AND s.target_role = 'staff'
                      AND public.gw_member_role() IN ('staff','instructor','librarian','director','admin','owner','super-admin','super_admin'))
                  OR (s.share_type = 'role' AND s.target_role = 'admin'
                      AND public.gw_member_role() = ANY (public.gw_admin_roles()))
                  OR (s.share_type = 'course' AND EXISTS (
                        SELECT 1 FROM public.gw_course_enrollments e
                         WHERE e.course_id = s.course_id
                           AND e.enrollment_status = 'enrolled'
                           AND (e.user_id = auth.uid() OR e.student_profile_id = auth.uid())))
             ))
           )
      )
    )
  );
$$;
REVOKE ALL ON FUNCTION public.gw_jukebox_playlist_visible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_jukebox_playlist_visible(uuid) TO authenticated;

-- ── 4. The Share dialog lists MEMBERS ──────────────────────────────────────

-- Who may share in this workspace: its admins and librarians (rule 4) — the
-- same people whose writes the share policies accept.
CREATE OR REPLACE FUNCTION public.gw_can_share_here()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.gw_is_admin_here() $$;
REVOKE ALL ON FUNCTION public.gw_can_share_here() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_can_share_here() TO authenticated;

-- The people a share can name: every member of the current workspace, with
-- their profile wherever it is homed. SECURITY DEFINER because gw_profiles
-- RLS hides profiles homed in other workspaces from the caller. Dropped first
-- so a future change to the column list can still be applied.
DROP FUNCTION IF EXISTS public.gw_share_people();
CREATE FUNCTION public.gw_share_people()
RETURNS TABLE (
  user_id     uuid,
  full_name   text,
  email       text,
  member_role text,
  voice_part  text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.gw_can_share_here() THEN
    RAISE EXCEPTION 'not allowed to share in this workspace' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT m.user_id, p.full_name, p.email, lower(m.role), p.voice_part
    FROM public.gw_tenant_members m
    JOIN public.gw_profiles p ON p.user_id = m.user_id
   WHERE m.tenant_id = public.current_tenant_id()
     AND coalesce(p.disabled, false) = false
   ORDER BY p.full_name NULLS LAST, p.email;
END;
$$;
REVOKE ALL ON FUNCTION public.gw_share_people() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_share_people() TO authenticated;

-- ── 5. "Why can't X see it?" ───────────────────────────────────────────────

-- One call as the person: which workspace the request is scoped to, whether
-- they hold a row there, their role, whether that makes them a MEMBER (sees
-- "Everyone" shares) or audience (sees only what names them), and whether
-- they run this workspace. If tenant_slug is not the site they are on, they
-- hold no row there — invite them. If it is, the share itself is wrong.
DROP FUNCTION IF EXISTS public.gw_my_access();
CREATE FUNCTION public.gw_my_access()
RETURNS TABLE (
  tenant_slug    text,
  has_membership boolean,
  member_role    text,
  is_member      boolean,
  is_admin_here  boolean,
  can_share      boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (SELECT t.slug FROM public.gw_tenants t WHERE t.id = public.current_tenant_id()),
         public.gw_has_membership(),
         public.gw_member_role(),
         public.gw_is_member(),
         public.gw_is_admin_here(),
         public.gw_can_share_here();
$$;
REVOKE ALL ON FUNCTION public.gw_my_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_my_access() TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Result check: rows by workspace and role.
SELECT t.slug, m.role, count(*) AS people
  FROM public.gw_tenant_members m
  JOIN public.gw_tenants t ON t.id = m.tenant_id
 GROUP BY t.slug, m.role
 ORDER BY t.slug, people DESC;

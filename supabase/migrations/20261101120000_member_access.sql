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
--      gw_tenant_members for that workspace. Nothing else is ever consulted.
--      (Where the rows come from: the gw-invite-student function, roster
--      import, Jukebox email shares — 20261008160000 — and the GleeWorld →
--      Yo-Doc mirror — 20261031120000. Section 1 below adds the last safety
--      net: an account homed in a workspace is a member of it.)
--
--   2. MEMBER = SCOPED.    current_tenant_id() honours the site a member is
--      on (x-tenant-slug) because of that row, so every tenant-isolated table
--      shows that workspace's rows. A person can be a member of many
--      workspaces; their profile is homed in only one. That is normal.
--
--   3. SHARED = VISIBLE.   A member sees a score or a playlist when a share
--      names them: everyone / this person / their class / their voice part
--      (scores), or everyone / staff / admins / this email / this class
--      (playlists). gw_share_reaches_me() is the one definition for scores;
--      gw_jukebox_playlist_visible() is the one for playlists, written in the
--      same terms.
--
--   4. YOU SHARE WITH MEMBERS, SO THE SHARE DIALOG LISTS MEMBERS.
--      gw_share_people() returns the current workspace's members (joined to
--      their profiles wherever those are homed). The old picker read
--      gw_profiles, which under RLS only ever showed accounts homed here — a
--      GleeWorld account invited to Yo-Doc could be shared with "Everyone" but
--      never picked by name.
--
--   5. gw_my_access() answers "why can't X see it?" in one call.
--
-- Everything is CREATE OR REPLACE / ON CONFLICT DO NOTHING: safe to re-run.
-- Membership is checked live on every request, so no sign-out is needed; a
-- page reload is enough.

BEGIN;

-- ── 1. Membership ──────────────────────────────────────────────────────────

-- Is the caller a member of the workspace this request is scoped to?
-- The platform owner counts as a member everywhere (they already bypass
-- tenant scoping in current_tenant_id()).
CREATE OR REPLACE FUNCTION public.gw_is_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.gw_tenant_members m
       WHERE m.user_id = auth.uid()
         AND m.tenant_id = public.current_tenant_id()
    )
    OR public.is_platform_owner()
  );
$$;
REVOKE ALL ON FUNCTION public.gw_is_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_is_member() TO authenticated;

-- The caller's membership role in the current workspace (lower-cased), or
-- NULL when they are not a member. Both super-admin spellings exist in
-- production data; compare against both wherever it matters.
CREATE OR REPLACE FUNCTION public.gw_member_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(m.role)
    FROM public.gw_tenant_members m
   WHERE m.user_id = auth.uid()
     AND m.tenant_id = public.current_tenant_id()
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.gw_member_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_member_role() TO authenticated;

-- Safety net for rule 1: an account HOMED in a workspace is a MEMBER of it.
-- Legacy accounts exist whose profile names a tenant but which never got a
-- membership row; they would see nothing on their own site once scoping is
-- by membership. Fans / VIPs (the public audience) are left alone, matching
-- the 2026-10-31 mirror. Existing rows are never changed.
INSERT INTO public.gw_tenant_members (user_id, tenant_id, role)
SELECT p.user_id, p.tenant_id, 'member'
  FROM public.gw_profiles p
 WHERE p.user_id IS NOT NULL
   AND p.tenant_id IS NOT NULL
   AND lower(coalesce(p.role, '')) NOT IN ('fan', 'vip')
   AND NOT EXISTS (
     SELECT 1 FROM public.gw_tenant_members m
      WHERE m.user_id = p.user_id AND m.tenant_id = p.tenant_id)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ── 2. Sheet music: does this share reach me? ──────────────────────────────

-- The ONE definition of "a score shared like this is visible to the caller".
-- Arguments are the four share columns on gw_sheet_music. SECURITY DEFINER
-- so the voice-part lane can read the caller's profile wherever it is homed.
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
  SELECT public.gw_is_member() AND (
    coalesce(p_everyone, false)
    OR auth.uid() = ANY (coalesce(p_users, '{}'::uuid[]))
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
  );
$$;
REVOKE ALL ON FUNCTION public.gw_share_reaches_me(boolean, uuid[], uuid[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_share_reaches_me(boolean, uuid[], uuid[], text[]) TO authenticated;

-- The Scores tab reads this view. Three lanes and nothing else:
--   librarians / admins  → everything in the workspace
--   the uploader         → their own scores
--   members              → what has been shared with them (rule 3)
-- security_invoker keeps the base table's RESTRICTIVE tenant policy in force,
-- so a member only ever sees the workspace they are on. Dropped and
-- recreated (not REPLACEd) so the column list always matches the table.
DROP VIEW IF EXISTS public.gw_sheet_music_browse;
CREATE VIEW public.gw_sheet_music_browse
WITH (security_invoker = on) AS
SELECT sm.*
  FROM public.gw_sheet_music sm
 WHERE sm.is_archived = false
   AND (
     public.can_edit_music_library()
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

-- Same rule, same words. A member sees a playlist when it is public in this
-- workspace, or a live share names them: everyone / staff / admins / their
-- email / their class. Admins see all. Tracks inherit from playlists
-- (jukebox_tracks_shared_read, 20261005150000) — nothing to change there.
CREATE OR REPLACE FUNCTION public.gw_jukebox_playlist_visible(p_playlist uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_is_admin()
  OR EXISTS (
    SELECT 1 FROM public.gw_jukebox_playlists pl
     WHERE pl.id = p_playlist
       AND pl.is_public
       AND pl.tenant_id = public.current_tenant_id()
  )
  OR (
    public.gw_is_member()
    AND EXISTS (
      SELECT 1 FROM public.gw_jukebox_playlist_shares s
       WHERE s.playlist_id = p_playlist
         AND s.tenant_id = public.current_tenant_id()
         AND s.revoked_at IS NULL
         AND (
           (s.share_type = 'role' AND s.target_role = 'member')
           OR (s.share_type = 'role' AND s.target_role = 'staff'
               AND public.gw_member_role() IN ('staff','admin','owner','super-admin','super_admin'))
           OR (s.share_type = 'role' AND s.target_role = 'admin'
               AND public.gw_member_role() IN ('admin','owner','super-admin','super_admin'))
           OR (s.share_type = 'email'
               AND lower(s.invited_email) = lower(auth.jwt() ->> 'email'))
           OR (s.share_type = 'course' AND EXISTS (
                 SELECT 1 FROM public.gw_course_enrollments e
                  WHERE e.course_id = s.course_id
                    AND e.user_id = auth.uid()))
         )
    )
  );
$$;

-- ── 4. The Share dialog lists MEMBERS ──────────────────────────────────────

-- Who may share things in this workspace: anyone who can edit the music
-- library (admins, librarians) or holds a staff-or-above membership role.
CREATE OR REPLACE FUNCTION public.gw_can_share_here()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_edit_music_library()
      OR public.user_has_tenant_role('staff');
$$;
REVOKE ALL ON FUNCTION public.gw_can_share_here() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_can_share_here() TO authenticated;

-- The people a share can name: every member of the current workspace, with
-- their profile wherever it is homed. SECURITY DEFINER because gw_profiles
-- RLS hides profiles homed in other workspaces from the caller.
CREATE OR REPLACE FUNCTION public.gw_share_people()
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
    LEFT JOIN public.gw_profiles p ON p.user_id = m.user_id
   WHERE m.tenant_id = public.current_tenant_id()
     AND coalesce(p.disabled, false) = false
   ORDER BY p.full_name NULLS LAST, p.email;
END;
$$;
REVOKE ALL ON FUNCTION public.gw_share_people() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_share_people() TO authenticated;

-- ── 5. "Why can't X see it?" ───────────────────────────────────────────────

-- One call, signed in as the person (or run with their JWT): which workspace
-- the request is scoped to, whether they are a member there, their role, and
-- whether they can share. If tenant_slug is not the site they are on, they
-- are not a member of it — invite them. If it is, the share itself is wrong.
CREATE OR REPLACE FUNCTION public.gw_my_access()
RETURNS TABLE (
  tenant_slug  text,
  is_member    boolean,
  member_role  text,
  can_share    boolean,
  manages_library boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (SELECT t.slug FROM public.gw_tenants t WHERE t.id = public.current_tenant_id()),
         public.gw_is_member(),
         public.gw_member_role(),
         public.gw_can_share_here(),
         public.can_edit_music_library();
$$;
REVOKE ALL ON FUNCTION public.gw_my_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gw_my_access() TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Result check: members by workspace and role.
SELECT t.slug, m.role, count(*) AS people
  FROM public.gw_tenant_members m
  JOIN public.gw_tenants t ON t.id = m.tenant_id
 GROUP BY t.slug, m.role
 ORDER BY t.slug, people DESC;

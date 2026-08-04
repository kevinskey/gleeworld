-- Server-enforced browse visibility for the music library Scores tab.
--
-- Until now the "members only see scores shared with them" rule lived in a
-- client-side PostgREST `.or(...)` filter (MusicLibraryPage.tsx), so any
-- member could list every non-archived score by querying gw_sheet_music
-- directly. This view moves the LISTING rule server-side.
--
-- Table RLS on gw_sheet_music is deliberately UNCHANGED: deep links
-- (?view=<id>) and setlist flows fetch rows by id and must keep working for
-- tenant members even when a score is unshared. Listing is enforced here;
-- by-id fetch remains a capability URL (UUIDs are unguessable). A future
-- RLS audit should NOT "fix" the open base-table SELECT — that would break
-- deep links and setlists by design decision (2026-08-02).
--
-- ── MULTI-TENANT SAFETY ──────────────────────────────────────────────────
-- 1. `security_invoker = on` (PG 15+) — the view runs with the CALLER's
--    privileges, so gw_sheet_music's RESTRICTIVE tenant-isolation and
--    course-gate policies fire against the caller's JWT claims. No tenant
--    filtering is re-implemented here; flipping this view to definer
--    semantics would silently drop tenant isolation. Don't.
-- 2. No new grants on the underlying table — only SELECT on the view, and
--    only to `authenticated`. The REVOKE below is load-bearing: PostgREST
--    auto-exposes public views and Supabase default privileges can grant
--    anon.

-- Server-side twin of useUserRole.canEditMusicLibrary() (frontend) and the
-- predicate used by the existing "Librarians can insert/update sheet music"
-- policies (20250905224110). Keep the three in sync.
CREATE OR REPLACE FUNCTION public.can_edit_music_library()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true OR role = 'librarian')
  )
  OR has_username_permission(
       (SELECT email FROM public.gw_profiles WHERE user_id = auth.uid()),
       'librarian_dashboard'
     );
$$;

REVOKE ALL ON FUNCTION public.can_edit_music_library() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_music_library() TO authenticated;

-- Browse lanes, in order:
--   librarian/admin        → everything non-archived
--   shared_with_members    → visible to all members
--   created_by             → the uploader always sees their own scores
--   shared_with_users      → shared with this user directly
--   shared_with_courses    → shared with a course the user is enrolled in
-- shared_with_users / shared_with_courses are NOT NULL DEFAULT '{}' (see
-- 20260725010000_sheet_music_share_targets.sql), so no NULL handling.
CREATE OR REPLACE VIEW public.gw_sheet_music_browse
WITH (security_invoker = on) AS
SELECT sm.*
FROM public.gw_sheet_music sm
WHERE sm.is_archived = false
  AND (
    public.can_edit_music_library()
    OR sm.shared_with_members = true
    OR sm.created_by = auth.uid()
    OR auth.uid() = ANY (sm.shared_with_users)
    OR EXISTS (
      SELECT 1 FROM public.gw_course_enrollments ce
      WHERE ce.course_id = ANY (sm.shared_with_courses)
        AND ce.enrollment_status = 'enrolled'
        AND (ce.user_id = auth.uid() OR ce.student_profile_id = auth.uid())
    )
  );

REVOKE ALL ON public.gw_sheet_music_browse FROM PUBLIC, anon;
GRANT SELECT ON public.gw_sheet_music_browse TO authenticated;

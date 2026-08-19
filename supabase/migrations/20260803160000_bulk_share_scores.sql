-- Bulk sharing for the music library: one atomic UPDATE that ADDS sharing
-- lanes to many scores at once (array union — never clobbers per-score
-- shares a librarian already granted).
--
-- SECURITY INVOKER on purpose: the UPDATE inside runs against the caller's
-- privileges, so the existing "Librarians can update sheet music" policy
-- plus the RESTRICTIVE tenant-isolation policies decide row by row. A
-- member calling this updates nothing and gets 0 back — the client treats
-- a short count as the usual RLS-silenced no-op.
--
-- p_set_everyone is three-valued: NULL leaves shared_with_members alone
-- (the bulk dialog defaults to "leave as-is"), true/false sets it.

CREATE OR REPLACE FUNCTION public.bulk_share_scores(
  p_score_ids uuid[],
  p_add_users uuid[] DEFAULT '{}',
  p_add_courses uuid[] DEFAULT '{}',
  p_add_voice_parts text[] DEFAULT '{}',
  p_set_everyone boolean DEFAULT NULL
) RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  WITH updated AS (
    UPDATE public.gw_sheet_music sm SET
      shared_with_users = (
        SELECT COALESCE(array_agg(DISTINCT u), '{}')
        FROM unnest(sm.shared_with_users || p_add_users) AS u
      ),
      shared_with_courses = (
        SELECT COALESCE(array_agg(DISTINCT c), '{}')
        FROM unnest(sm.shared_with_courses || p_add_courses) AS c
      ),
      shared_with_voice_parts = (
        SELECT COALESCE(array_agg(DISTINCT v), '{}')
        FROM unnest(sm.shared_with_voice_parts || p_add_voice_parts) AS v
      ),
      shared_with_members = COALESCE(p_set_everyone, sm.shared_with_members)
    WHERE sm.id = ANY (p_score_ids)
    RETURNING 1
  )
  SELECT count(*)::int FROM updated;
$$;

REVOKE ALL ON FUNCTION public.bulk_share_scores(uuid[], uuid[], uuid[], text[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_share_scores(uuid[], uuid[], uuid[], text[], boolean) TO authenticated;

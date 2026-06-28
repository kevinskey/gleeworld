-- LTI multi-course support.
--
-- Phase 2 captured the user's MOST RECENT Canvas context on
-- lti_user_links.last_context_id. That's fine for the single-Canvas-
-- course case, but a student who's enrolled in two Canvas courses
-- through the same Canvas instance would only get grades pushed to the
-- most recent one. Fix:
--
--   1. New lti_user_contexts table — every (user, context) tuple we've
--      ever seen at launch time, not just the last.
--   2. Add lti_context_links.gw_course_id — an explicit binding from
--      a Canvas course to a GleeWorld course, so the grade push knows
--      which Canvas context to target for which GleeWorld assignment.
--
-- approve-ai-grade uses the (user, course) → context join to push a
-- grade to the correct Canvas course. If no binding exists yet, the
-- old "last" heuristic still applies as a fallback (set in the function
-- itself).

-- Per-user, per-context membership ledger.
CREATE TABLE IF NOT EXISTS lti_user_contexts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_link_id    uuid NOT NULL REFERENCES lti_user_links(id) ON DELETE CASCADE,
  context_link_id uuid NOT NULL REFERENCES lti_context_links(id) ON DELETE CASCADE,
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_link_id, context_link_id)
);

CREATE INDEX IF NOT EXISTS lti_user_contexts_link_idx ON lti_user_contexts (user_link_id);
CREATE INDEX IF NOT EXISTS lti_user_contexts_ctx_idx  ON lti_user_contexts (context_link_id);

ALTER TABLE lti_user_contexts ENABLE ROW LEVEL SECURITY;
-- A user can read their own context links.
CREATE POLICY lti_user_contexts_own ON lti_user_contexts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM lti_user_links ul
    WHERE ul.id = lti_user_contexts.user_link_id AND ul.user_id = auth.uid()
  ));

-- Explicit binding: which Canvas context corresponds to which GleeWorld
-- course. Set by a super-admin from the LTI Platforms admin UI (or
-- auto-bound by an instructor's first launch — Phase 4). Nullable so
-- newly captured contexts can sit unbound until someone configures.
ALTER TABLE lti_context_links
  ADD COLUMN IF NOT EXISTS gw_course_id uuid REFERENCES gw_courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lti_context_links_course_idx
  ON lti_context_links (gw_course_id) WHERE gw_course_id IS NOT NULL;

-- LTI 1.3 Phase 3 — Deep Linking state storage.
--
-- A DeepLinkingRequest launch tells us where to POST the chosen content
-- back (`deep_link_return_url`) and includes an opaque `data` field we
-- must echo unchanged. We persist that bundle keyed by a random handle
-- so the instructor's picker UI (no LTI knowledge needed) can later
-- ask the lti-deep-link-response function to sign the reply JWT.
--
-- Rows expire after 30 minutes — generous because the instructor may
-- browse the picker for a while before choosing.

CREATE TABLE IF NOT EXISTS lti_deep_link_state (
  handle             text PRIMARY KEY,                  -- random URL-safe id passed to picker
  platform_id        uuid NOT NULL REFERENCES lti_platforms(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Echo-back fields from the deep linking settings claim.
  deep_link_return_url text NOT NULL,
  data               text,                              -- opaque, must be returned verbatim
  accept_types       text[],                            -- e.g. ['ltiResourceLink']
  accept_presentation_targets text[],                   -- e.g. ['iframe','window']
  accept_multiple    boolean DEFAULT false,
  -- Bookkeeping.
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lti_deep_link_state_created_idx ON lti_deep_link_state (created_at);

ALTER TABLE lti_deep_link_state ENABLE ROW LEVEL SECURITY;
-- The instructor (= row's user_id) can read while their picker is open.
CREATE POLICY lti_deep_link_state_own ON lti_deep_link_state FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION lti_cleanup_deep_link_state() RETURNS void
LANGUAGE sql AS $$
  DELETE FROM lti_deep_link_state WHERE created_at < now() - interval '30 minutes';
$$;

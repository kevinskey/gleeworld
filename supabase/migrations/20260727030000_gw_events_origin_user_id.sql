-- gw_events.origin_user_id — the user who published this event. Non-null
-- ONLY for rows created via google-event-share (external_source =
-- 'google_calendar'). Used by google-event-unshare to gate deletion and
-- by google-sync to know whose Google response to compare against.
--
-- Full unique index enforces republish idempotency: the same user
-- re-sharing the same Google event to any calendar in the same tenant
-- lands on the same row instead of duplicating. Non-Google gw_events rows
-- have origin_user_id = NULL and are treated as distinct by Postgres unique
-- semantics, so they never collide.

ALTER TABLE public.gw_events
  ADD COLUMN IF NOT EXISTS origin_user_id uuid REFERENCES auth.users(id);

-- Republish idempotency: same user re-sharing the same Google event
-- lands on the same row. Non-Google gw_events rows have
-- origin_user_id = NULL and are treated as distinct by Postgres unique
-- semantics, so they never collide.
CREATE UNIQUE INDEX IF NOT EXISTS gw_events_google_origin_uniq
  ON public.gw_events (tenant_id, external_id, origin_user_id);

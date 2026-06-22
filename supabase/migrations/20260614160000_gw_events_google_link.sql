-- Track which Google Calendar event mirrors each gw_events row, so updates
-- in GleeWorld translate into PATCH calls to the same Google event (not
-- duplicate creates) and deletes can DELETE the right one.
--
-- Scope: MVP pushes only to the event creator's Google account. Multi-user
-- fan-out (push to every connected user in the tenant) is a follow-up that
-- would replace these columns with a junction table.

alter table public.gw_events
  add column if not exists google_event_id    text,
  add column if not exists google_pushed_at   timestamptz,
  add column if not exists google_push_error  text;

create index if not exists gw_events_google_event_idx
  on public.gw_events (google_event_id)
  where google_event_id is not null;

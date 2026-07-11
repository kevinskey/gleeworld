-- "failed to create an event": gw_events inserts sync into the legacy
-- events table (sync_gw_event_to_events_trigger), whose
-- events_event_type_check predates the canonical UI list in
-- src/constants/eventTypes.ts. Seven UI-offered types (recording,
-- service, tour-event, festival, camp, lesson, community) — plus the
-- planner's generic 'event' — violated the check, so those creates
-- 400'd (SQLSTATE 23514). Constraint now accepts the union of the old
-- list and the UI list; nothing existing becomes invalid.
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check CHECK (
  event_type = ANY (ARRAY[
    -- legacy list
    'performance','rehearsal','meeting','other','concert','workshop',
    'masterclass','audition','competition','voice-lesson','sectional',
    'tutorial','member-meeting','exec-meeting','social','fundraiser',
    'banquet','retreat','tour','tour_stop','travel','class','academic',
    'deadline','holiday','worship_event','volunteer',
    -- canonical UI list additions (src/constants/eventTypes.ts)
    'service','tour-event','recording','festival','camp','lesson','community',
    -- planner AddEventDialog generic type
    'event'
  ]::text[])
);

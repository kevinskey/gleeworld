
-- 1. Make ALL Touring calendar events public so they appear on both internal and public calendars
UPDATE public.gw_events
SET is_public = true
WHERE calendar_id = 'a387a4de-4a01-46e4-af1c-5c3b18423177';

-- 2. Add the missing Atlanta return date (Mar 18) which has no calendar event
INSERT INTO public.gw_events (
  title,
  description,
  event_type,
  start_date,
  end_date,
  location,
  venue_name,
  calendar_id,
  is_public,
  status,
  created_by
) VALUES (
  'Return to Atlanta — Spring Tour 2026',
  'Spring Tour 2026 concludes. Return to Atlanta, Georgia.',
  'tour',
  '2026-03-18 13:00:00+00',
  '2026-03-18 23:00:00+00',
  'Atlanta, Georgia',
  'Spelman College',
  'a387a4de-4a01-46e4-af1c-5c3b18423177',
  true,
  'scheduled',
  'a9b62b0a-1bc6-45f2-9747-368494a05bbc'
);

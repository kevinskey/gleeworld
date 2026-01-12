-- Insert the 100th Annual Spelman Morehouse Christmas Carol event
INSERT INTO public.gw_events (
  title,
  description,
  event_type,
  start_date,
  end_date,
  location,
  venue_name,
  is_public,
  status,
  registration_required,
  calendar_id,
  created_by
) VALUES (
  'The 100th Annual Spelman Morehouse Christmas Carol',
  'Join us for a historic celebration of 100 years of the beloved Spelman Morehouse Christmas Carol tradition. This landmark event brings together the Spelman College Glee Club and the Morehouse College Glee Club for three magical evenings of music, fellowship, and celebration.',
  'concert',
  '2026-12-05 19:00:00+00',
  '2026-12-07 21:00:00+00',
  'Sisters Chapel, Spelman College',
  'Sisters Chapel',
  true,
  'upcoming',
  true,
  'd9184231-0b66-4707-8773-37e776e0c949',
  'aece359b-a80a-4726-ad75-49ed17fe20d2'
);
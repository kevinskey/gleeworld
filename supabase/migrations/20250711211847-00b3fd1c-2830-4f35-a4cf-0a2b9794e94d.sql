-- Disable all existing triggers to avoid conflicts during migration
DROP TRIGGER IF EXISTS sync_gw_event_to_events_trigger ON public.gw_events;
DROP TRIGGER IF EXISTS sync_event_to_gw_events_trigger ON public.events;

-- Remove the old sync function that was causing conflicts
DROP FUNCTION IF EXISTS public.sync_gw_event_to_events();

-- First, copy existing profiles to gw_profiles if they don't exist
INSERT INTO public.gw_profiles (
  id,
  email,
  first_name,
  last_name,
  full_name,
  created_at,
  updated_at
)
SELECT 
  p.id,
  p.email,
  NULL as first_name,
  NULL as last_name, 
  p.full_name,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_profiles gw WHERE gw.id = p.id
);

-- Now copy all existing events from events table to gw_events table
INSERT INTO public.gw_events (
  id,
  title,
  description,
  start_date,
  end_date,
  event_type,
  location,
  venue_name,
  address,
  max_attendees,
  registration_required,
  is_public,
  status,
  created_by,
  created_at,
  updated_at
)
SELECT 
  e.id,
  e.title,
  COALESCE(e.description, e.brief_description) as description,
  e.start_date,
  e.end_date,
  e.event_type,
  e.location,
  e.event_name as venue_name,
  NULL as address,
  e.expected_headcount as max_attendees,
  CASE WHEN e.approval_needed = true THEN true ELSE false END as registration_required,
  true as is_public, -- Default to public for existing events
  CASE WHEN e.approved = true THEN 'confirmed' ELSE 'scheduled' END as status,
  e.created_by,
  e.created_at,
  e.updated_at
FROM public.events e
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_events gw WHERE gw.id = e.id
) AND e.created_by IS NOT NULL;
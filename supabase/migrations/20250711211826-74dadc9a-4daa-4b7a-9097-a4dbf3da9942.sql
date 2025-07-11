-- Temporarily disable the trigger to avoid conflicts during migration
DROP TRIGGER IF EXISTS sync_gw_event_to_events_trigger ON public.gw_events;

-- First, copy existing profiles to gw_profiles if needed (this should work now)
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

-- Update the sync function to use UPSERT instead of INSERT
CREATE OR REPLACE FUNCTION public.sync_gw_event_to_events()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- When a gw_event is created or updated, sync to events table with UPSERT
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO events (
      id,
      title,
      description,
      event_type,
      start_date,
      end_date,
      location,
      created_by,
      created_at,
      updated_at,
      send_contracts,
      event_name,
      expected_headcount,
      approval_needed,
      approved
    ) VALUES (
      NEW.id,
      NEW.title,
      NEW.description,
      COALESCE(NEW.event_type, 'other'),
      NEW.start_date,
      NEW.end_date,
      COALESCE(NEW.location, NEW.venue_name),
      NEW.created_by,
      NEW.created_at,
      NEW.updated_at,
      false,  -- Default to not sending contracts automatically
      NEW.venue_name,
      NEW.max_attendees,
      COALESCE(NEW.registration_required, false),
      CASE WHEN NEW.status = 'confirmed' THEN true ELSE false END
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      event_type = EXCLUDED.event_type,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      location = EXCLUDED.location,
      updated_at = EXCLUDED.updated_at,
      event_name = EXCLUDED.event_name,
      expected_headcount = EXCLUDED.expected_headcount,
      approval_needed = EXCLUDED.approval_needed,
      approved = EXCLUDED.approved;
    RETURN NEW;
  END IF;
  
  -- When a gw_event is deleted, also delete from events table
  IF TG_OP = 'DELETE' THEN
    DELETE FROM events WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Re-create the trigger
CREATE TRIGGER sync_gw_event_to_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.gw_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gw_event_to_events();
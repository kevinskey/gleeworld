-- Create sync function to keep events table updated when gw_events changes
CREATE OR REPLACE FUNCTION public.sync_gw_event_to_events()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- When a gw_event is created or updated, sync to events table
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

-- Create sync function to keep gw_events table updated when events changes
CREATE OR REPLACE FUNCTION public.sync_event_to_gw_events()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- When an event is created or updated, sync to gw_events
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO gw_events (
      id,
      title,
      description,
      event_type,
      start_date,
      end_date,
      location,
      venue_name,
      max_attendees,
      registration_required,
      is_public,
      status,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.title,
      COALESCE(NEW.description, NEW.brief_description),
      NEW.event_type,
      NEW.start_date,
      NEW.end_date,
      NEW.location,
      NEW.event_name,
      NEW.expected_headcount,
      COALESCE(NEW.approval_needed, false),
      true, -- Default to public
      CASE WHEN NEW.approved = true THEN 'confirmed' ELSE 'scheduled' END,
      NEW.created_by,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      event_type = EXCLUDED.event_type,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      location = EXCLUDED.location,
      venue_name = EXCLUDED.venue_name,
      max_attendees = EXCLUDED.max_attendees,
      registration_required = EXCLUDED.registration_required,
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at;
    RETURN NEW;
  END IF;
  
  -- When an event is deleted, also delete from gw_events
  IF TG_OP = 'DELETE' THEN
    DELETE FROM gw_events WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Create triggers to keep tables in sync
CREATE TRIGGER sync_gw_event_to_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.gw_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gw_event_to_events();

CREATE TRIGGER sync_event_to_gw_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_to_gw_events();
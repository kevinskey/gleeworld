-- Fix the infinite recursion issue by removing the bidirectional sync triggers
-- and implementing a safer approach

-- First, drop the existing triggers that cause infinite recursion
DROP TRIGGER IF EXISTS sync_event_to_gw_events_trigger ON public.events;
DROP TRIGGER IF EXISTS sync_gw_event_to_events_trigger ON public.gw_events;

-- Drop the problematic sync functions
DROP FUNCTION IF EXISTS public.sync_event_to_gw_events();
DROP FUNCTION IF EXISTS public.sync_gw_event_to_events();

-- Create a safer one-way sync approach
-- Only sync from gw_events to events (not bidirectional)
CREATE OR REPLACE FUNCTION public.sync_gw_event_to_events()
RETURNS TRIGGER AS $$
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
      false,
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
$$ LANGUAGE plpgsql;

-- Create the one-way sync trigger (only from gw_events to events)
CREATE TRIGGER sync_gw_event_to_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.gw_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gw_event_to_events();
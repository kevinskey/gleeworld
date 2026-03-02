CREATE OR REPLACE FUNCTION sync_gw_event_to_events()
RETURNS TRIGGER AS $$
BEGIN
  -- When a gw_event is created or updated, sync to events table
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Skip sync if created_by is null (events table requires it)
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
    
    INSERT INTO events (
      id, title, description, event_type, start_date, end_date, location,
      created_by, created_at, updated_at, send_contracts, event_name,
      expected_headcount, approval_needed, approved, image_url, is_private
    ) VALUES (
      NEW.id, NEW.title, NEW.description, COALESCE(NEW.event_type, 'other'),
      NEW.start_date, NEW.end_date, COALESCE(NEW.location, NEW.venue_name),
      NEW.created_by, NEW.created_at, NEW.updated_at, false, NEW.venue_name,
      NEW.max_attendees, COALESCE(NEW.registration_required, false),
      CASE WHEN NEW.status = 'confirmed' THEN true ELSE false END,
      NEW.image_url, COALESCE(NEW.is_private, false)
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, description = EXCLUDED.description,
      event_type = EXCLUDED.event_type, start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date, location = EXCLUDED.location,
      updated_at = EXCLUDED.updated_at, event_name = EXCLUDED.event_name,
      expected_headcount = EXCLUDED.expected_headcount,
      approval_needed = EXCLUDED.approval_needed, approved = EXCLUDED.approved,
      image_url = EXCLUDED.image_url, is_private = EXCLUDED.is_private;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    DELETE FROM events WHERE id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
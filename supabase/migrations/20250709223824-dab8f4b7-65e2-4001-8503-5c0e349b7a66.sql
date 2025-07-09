-- Add RLS policies for gw_events table to allow authenticated users to create and manage events

-- Allow authenticated users to create events
CREATE POLICY "Authenticated users can create events" 
ON gw_events 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own events
CREATE POLICY "Users can update their own events" 
ON gw_events 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by);

-- Allow users to delete their own events
CREATE POLICY "Users can delete their own events" 
ON gw_events 
FOR DELETE 
TO authenticated 
USING (auth.uid() = created_by);

-- Allow admins to manage all events
CREATE POLICY "Admins can manage all events" 
ON gw_events 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super-admin')
  )
);

-- Create a function to sync gw_events with the events table for contract functionality
CREATE OR REPLACE FUNCTION sync_gw_event_to_events()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new gw_event is created, also create an entry in the events table
  -- This allows the calendar events to tie into the contract system
  IF TG_OP = 'INSERT' THEN
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
      send_contracts
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
      false  -- Default to not sending contracts automatically
    );
    RETURN NEW;
  END IF;
  
  -- When a gw_event is updated, sync changes to events table
  IF TG_OP = 'UPDATE' THEN
    UPDATE events SET
      title = NEW.title,
      description = NEW.description,
      event_type = COALESCE(NEW.event_type, 'other'),
      start_date = NEW.start_date,
      end_date = NEW.end_date,
      location = COALESCE(NEW.location, NEW.venue_name),
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
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

-- Create trigger to automatically sync gw_events with events table
CREATE TRIGGER sync_gw_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON gw_events
  FOR EACH ROW
  EXECUTE FUNCTION sync_gw_event_to_events();
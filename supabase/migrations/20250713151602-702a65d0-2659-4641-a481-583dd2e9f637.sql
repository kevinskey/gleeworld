-- Create function to generate recurring rehearsal events
CREATE OR REPLACE FUNCTION public.create_recurring_rehearsals(
  start_date DATE,
  end_date DATE,
  created_by_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_date DATE;
  event_count INTEGER := 0;
  event_start_time TIMESTAMP WITH TIME ZONE;
  event_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Start from the given start_date
  current_date := start_date;
  
  -- Loop through dates until end_date
  WHILE current_date <= end_date LOOP
    -- Check if current_date is Monday (1), Wednesday (3), or Friday (5)
    IF EXTRACT(DOW FROM current_date) IN (1, 3, 5) THEN
      -- Set start time to 5:00 PM (17:00)
      event_start_time := current_date + INTERVAL '17 hours';
      -- Set end time to 6:15 PM (18:15)
      event_end_time := current_date + INTERVAL '18 hours 15 minutes';
      
      -- Insert the rehearsal event
      INSERT INTO public.gw_events (
        title,
        description,
        event_type,
        start_date,
        end_date,
        venue_name,
        location,
        is_public,
        registration_required,
        status,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        'Spelman College Glee Club Rehearsal',
        'Regular rehearsal for the Spelman College Glee Club. All members are expected to attend.',
        'rehearsal',
        event_start_time,
        event_end_time,
        'Spelman College Music Building',
        'Atlanta, GA',
        true,
        false,
        'scheduled',
        created_by_id,
        NOW(),
        NOW()
      );
      
      event_count := event_count + 1;
    END IF;
    
    -- Move to next day
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN event_count;
END;
$$;

-- Create a function to clean up old rehearsal events
CREATE OR REPLACE FUNCTION public.cleanup_old_rehearsals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete rehearsal events that are older than 30 days
  DELETE FROM public.gw_events 
  WHERE title = 'Spelman College Glee Club Rehearsal'
    AND event_type = 'rehearsal'
    AND start_date < NOW() - INTERVAL '30 days';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
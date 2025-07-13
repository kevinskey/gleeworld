-- Fix the event type to use a valid value that passes the check constraint
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
  loop_date DATE;
  event_count INTEGER := 0;
  event_start_time TIMESTAMP WITH TIME ZONE;
  event_end_time TIMESTAMP WITH TIME ZONE;
  default_user_id UUID;
BEGIN
  -- Get a default user ID if none provided (use the first admin/super-admin)
  IF created_by_id IS NULL THEN
    SELECT id INTO default_user_id 
    FROM public.profiles 
    WHERE role IN ('admin', 'super-admin') 
    LIMIT 1;
    
    IF default_user_id IS NULL THEN
      RAISE EXCEPTION 'No admin user found and no created_by_id provided';
    END IF;
    
    created_by_id := default_user_id;
  END IF;
  
  -- Start from the given start_date
  loop_date := start_date;
  
  -- Loop through dates until end_date
  WHILE loop_date <= end_date LOOP
    -- Check if loop_date is Monday (1), Wednesday (3), or Friday (5)
    IF EXTRACT(DOW FROM loop_date) IN (1, 3, 5) THEN
      -- Set start time to 5:00 PM (17:00)
      event_start_time := loop_date + INTERVAL '17 hours';
      -- Set end time to 6:15 PM (18:15)
      event_end_time := loop_date + INTERVAL '18 hours 15 minutes';
      
      -- Insert the rehearsal event with 'performance' event_type to pass check constraint
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
        'performance',
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
    loop_date := loop_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN event_count;
END;
$$;
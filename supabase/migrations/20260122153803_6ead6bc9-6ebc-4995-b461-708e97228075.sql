-- Create comprehensive function for creating recurring events in gw_events table
CREATE OR REPLACE FUNCTION public.create_recurring_gw_events(
  p_title text,
  p_start_date timestamp with time zone,
  p_calendar_id uuid,
  p_description text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_event_type text DEFAULT 'performance',
  p_recurrence_type text DEFAULT 'weekly',
  p_recurrence_interval integer DEFAULT 1,
  p_recurrence_days text[] DEFAULT ARRAY['monday', 'wednesday', 'friday'],
  p_recurrence_end_date timestamp with time zone DEFAULT NULL,
  p_max_occurrences integer DEFAULT 52,
  p_is_public boolean DEFAULT true,
  p_created_by uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  parent_event_id uuid;
  iter_date date;
  occurrence_count integer := 0;
  created_events uuid[] := ARRAY[]::uuid[];
  days_map jsonb := '{"sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4, "friday": 5, "saturday": 6}';
  target_day_numbers integer[];
  event_start_time timestamp with time zone;
  event_end_time timestamp with time zone;
  new_event_id uuid;
  start_time_of_day time;
  duration_interval interval;
BEGIN
  -- Validate inputs
  IF p_recurrence_end_date IS NULL THEN
    p_recurrence_end_date := p_start_date + interval '1 year';
  END IF;
  
  -- Extract time of day from start_date
  start_time_of_day := p_start_date::time;
  
  -- Calculate duration if end_date provided
  IF p_end_date IS NOT NULL THEN
    duration_interval := p_end_date - p_start_date;
  ELSE
    duration_interval := interval '2 hours';
  END IF;
  
  -- Convert day names to numbers
  SELECT array_agg((days_map->>day_name)::integer)
  INTO target_day_numbers
  FROM unnest(p_recurrence_days) AS day_name;
  
  -- Create parent event (the first occurrence)
  INSERT INTO public.gw_events (
    title, description, location, start_date, end_date,
    event_type, is_recurring, recurrence_type, recurrence_interval,
    recurrence_days_of_week, recurrence_end_date, max_occurrences,
    calendar_id, is_public, created_by, status
  ) VALUES (
    p_title, p_description, p_location, p_start_date, p_end_date,
    p_event_type, true, p_recurrence_type, p_recurrence_interval,
    p_recurrence_days, p_recurrence_end_date, p_max_occurrences,
    p_calendar_id, p_is_public, p_created_by, 'scheduled'
  ) RETURNING id INTO parent_event_id;
  
  created_events := created_events || parent_event_id;
  occurrence_count := 1;
  
  -- Generate recurring events based on frequency
  iter_date := p_start_date::date;
  
  CASE p_recurrence_type
    WHEN 'daily' THEN
      -- Daily recurrence
      WHILE iter_date <= p_recurrence_end_date::date AND occurrence_count < p_max_occurrences LOOP
        iter_date := iter_date + (p_recurrence_interval || ' days')::interval;
        
        IF iter_date <= p_recurrence_end_date::date THEN
          event_start_time := iter_date + start_time_of_day;
          event_end_time := event_start_time + duration_interval;
          
          INSERT INTO public.gw_events (
            title, description, location, start_date, end_date,
            event_type, is_recurring, parent_event_id,
            calendar_id, is_public, created_by, status
          ) VALUES (
            p_title, p_description, p_location, event_start_time, event_end_time,
            p_event_type, false, parent_event_id,
            p_calendar_id, p_is_public, p_created_by, 'scheduled'
          ) RETURNING id INTO new_event_id;
          
          created_events := created_events || new_event_id;
          occurrence_count := occurrence_count + 1;
        END IF;
      END LOOP;
      
    WHEN 'weekly' THEN
      -- Weekly recurrence on specific days
      WHILE iter_date <= p_recurrence_end_date::date AND occurrence_count < p_max_occurrences LOOP
        -- Move to next week
        iter_date := iter_date + (7 * p_recurrence_interval || ' days')::interval;
        
        -- Create events for each specified day of the week
        IF target_day_numbers IS NOT NULL AND array_length(target_day_numbers, 1) > 0 THEN
          FOR i IN 1..array_length(target_day_numbers, 1) LOOP
            DECLARE
              target_day_num integer := target_day_numbers[i];
              days_to_add integer;
              target_date date;
            BEGIN
              -- Calculate days to add to get to target day
              days_to_add := (target_day_num - extract(dow from iter_date)::integer + 7) % 7;
              target_date := iter_date + (days_to_add || ' days')::interval;
              
              IF target_date <= p_recurrence_end_date::date AND occurrence_count < p_max_occurrences THEN
                event_start_time := target_date + start_time_of_day;
                event_end_time := event_start_time + duration_interval;
                
                INSERT INTO public.gw_events (
                  title, description, location, start_date, end_date,
                  event_type, is_recurring, parent_event_id,
                  calendar_id, is_public, created_by, status
                ) VALUES (
                  p_title, p_description, p_location, event_start_time, event_end_time,
                  p_event_type, false, parent_event_id,
                  p_calendar_id, p_is_public, p_created_by, 'scheduled'
                ) RETURNING id INTO new_event_id;
                
                created_events := created_events || new_event_id;
                occurrence_count := occurrence_count + 1;
              END IF;
            END;
          END LOOP;
        END IF;
      END LOOP;
      
    WHEN 'monthly' THEN
      -- Monthly recurrence
      WHILE iter_date <= p_recurrence_end_date::date AND occurrence_count < p_max_occurrences LOOP
        iter_date := iter_date + (p_recurrence_interval || ' months')::interval;
        
        IF iter_date <= p_recurrence_end_date::date THEN
          event_start_time := iter_date + start_time_of_day;
          event_end_time := event_start_time + duration_interval;
          
          INSERT INTO public.gw_events (
            title, description, location, start_date, end_date,
            event_type, is_recurring, parent_event_id,
            calendar_id, is_public, created_by, status
          ) VALUES (
            p_title, p_description, p_location, event_start_time, event_end_time,
            p_event_type, false, parent_event_id,
            p_calendar_id, p_is_public, p_created_by, 'scheduled'
          ) RETURNING id INTO new_event_id;
          
          created_events := created_events || new_event_id;
          occurrence_count := occurrence_count + 1;
        END IF;
      END LOOP;
  END CASE;
  
  RETURN jsonb_build_object(
    'success', true,
    'parent_event_id', parent_event_id,
    'created_events', created_events,
    'total_events', array_length(created_events, 1),
    'message', 'Successfully created ' || array_length(created_events, 1) || ' recurring events'
  );
END;
$$;
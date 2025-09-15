-- Create improved recurring events system with fixed variable names
-- First, add recurring fields to events table if they don't exist
DO $$ 
BEGIN
  -- Add recurring fields to events table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_recurring') THEN
    ALTER TABLE public.events ADD COLUMN is_recurring boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'recurring_frequency') THEN
    ALTER TABLE public.events ADD COLUMN recurring_frequency text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'recurring_interval') THEN
    ALTER TABLE public.events ADD COLUMN recurring_interval integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'recurring_days') THEN
    ALTER TABLE public.events ADD COLUMN recurring_days text[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'recurring_end_date') THEN
    ALTER TABLE public.events ADD COLUMN recurring_end_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'recurring_parent_id') THEN
    ALTER TABLE public.events ADD COLUMN recurring_parent_id uuid REFERENCES events(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'recurring_occurrence_date') THEN
    ALTER TABLE public.events ADD COLUMN recurring_occurrence_date date;
  END IF;
END $$;

-- Create comprehensive function for creating recurring events
CREATE OR REPLACE FUNCTION public.create_recurring_events(
  p_title text,
  p_start_date timestamp with time zone,
  p_description text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL,
  p_event_type text DEFAULT 'general',
  p_recurring_frequency text DEFAULT 'weekly',
  p_recurring_interval integer DEFAULT 1,
  p_recurring_days text[] DEFAULT ARRAY['monday', 'wednesday', 'friday'],
  p_recurring_end_date date DEFAULT NULL,
  p_max_occurrences integer DEFAULT 52,
  p_created_by uuid DEFAULT auth.uid()
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
BEGIN
  -- Validate inputs
  IF p_recurring_end_date IS NULL THEN
    p_recurring_end_date := (p_start_date::date + interval '1 year')::date;
  END IF;
  
  -- Convert day names to numbers
  SELECT array_agg((days_map->>day_name)::integer)
  INTO target_day_numbers
  FROM unnest(p_recurring_days) AS day_name;
  
  -- Create parent event
  INSERT INTO public.events (
    title, description, location, start_date, end_date, start_time, end_time,
    event_type, is_recurring, recurring_frequency, recurring_interval,
    recurring_days, recurring_end_date, created_by
  ) VALUES (
    p_title, p_description, p_location, p_start_date, p_end_date, p_start_time, p_end_time,
    p_event_type, true, p_recurring_frequency, p_recurring_interval,
    p_recurring_days, p_recurring_end_date, p_created_by
  ) RETURNING id INTO parent_event_id;
  
  created_events := created_events || parent_event_id;
  
  -- Generate recurring events based on frequency
  iter_date := p_start_date::date;
  
  CASE p_recurring_frequency
    WHEN 'daily' THEN
      -- Daily recurrence
      WHILE iter_date <= p_recurring_end_date AND occurrence_count < p_max_occurrences LOOP
        iter_date := iter_date + (p_recurring_interval || ' days')::interval;
        
        IF iter_date <= p_recurring_end_date THEN
          event_start_time := iter_date::timestamp + COALESCE(p_start_time, '09:00'::time);
          event_end_time := CASE 
            WHEN p_end_time IS NOT NULL THEN iter_date::timestamp + p_end_time
            WHEN p_end_date IS NOT NULL THEN event_start_time + (p_end_date - p_start_date)
            ELSE event_start_time + interval '1 hour'
          END;
          
          INSERT INTO public.events (
            title, description, location, start_date, end_date, start_time, end_time,
            event_type, is_recurring, recurring_parent_id, recurring_occurrence_date, created_by
          ) VALUES (
            p_title, p_description, p_location, event_start_time, event_end_time,
            p_start_time, p_end_time, p_event_type, false, parent_event_id, iter_date, p_created_by
          ) RETURNING id INTO new_event_id;
          
          created_events := created_events || new_event_id;
          occurrence_count := occurrence_count + 1;
        END IF;
      END LOOP;
      
    WHEN 'weekly' THEN
      -- Weekly recurrence on specific days
      WHILE iter_date <= p_recurring_end_date AND occurrence_count < p_max_occurrences LOOP
        -- Move to next week
        iter_date := iter_date + (7 * p_recurring_interval || ' days')::interval;
        
        -- Create events for each specified day of the week
        FOR i IN 1..array_length(target_day_numbers, 1) LOOP
          DECLARE
            target_day_num integer := target_day_numbers[i];
            days_to_add integer;
            target_date date;
          BEGIN
            -- Calculate days to add to get to target day
            days_to_add := (target_day_num - extract(dow from iter_date)::integer + 7) % 7;
            target_date := iter_date + (days_to_add || ' days')::interval;
            
            IF target_date <= p_recurring_end_date AND occurrence_count < p_max_occurrences THEN
              event_start_time := target_date::timestamp + COALESCE(p_start_time, '09:00'::time);
              event_end_time := CASE 
                WHEN p_end_time IS NOT NULL THEN target_date::timestamp + p_end_time
                WHEN p_end_date IS NOT NULL THEN event_start_time + (p_end_date - p_start_date)
                ELSE event_start_time + interval '1 hour'
              END;
              
              INSERT INTO public.events (
                title, description, location, start_date, end_date, start_time, end_time,
                event_type, is_recurring, recurring_parent_id, recurring_occurrence_date, created_by
              ) VALUES (
                p_title, p_description, p_location, event_start_time, event_end_time,
                p_start_time, p_end_time, p_event_type, false, parent_event_id, target_date, p_created_by
              ) RETURNING id INTO new_event_id;
              
              created_events := created_events || new_event_id;
              occurrence_count := occurrence_count + 1;
            END IF;
          END;
        END LOOP;
      END LOOP;
      
    WHEN 'monthly' THEN
      -- Monthly recurrence
      WHILE iter_date <= p_recurring_end_date AND occurrence_count < p_max_occurrences LOOP
        iter_date := iter_date + (p_recurring_interval || ' months')::interval;
        
        IF iter_date <= p_recurring_end_date THEN
          event_start_time := iter_date::timestamp + COALESCE(p_start_time, '09:00'::time);
          event_end_time := CASE 
            WHEN p_end_time IS NOT NULL THEN iter_date::timestamp + p_end_time
            WHEN p_end_date IS NOT NULL THEN event_start_time + (p_end_date - p_start_date)
            ELSE event_start_time + interval '1 hour'
          END;
          
          INSERT INTO public.events (
            title, description, location, start_date, end_date, start_time, end_time,
            event_type, is_recurring, recurring_parent_id, recurring_occurrence_date, created_by
          ) VALUES (
            p_title, p_description, p_location, event_start_time, event_end_time,
            p_start_time, p_end_time, p_event_type, false, parent_event_id, iter_date, p_created_by
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
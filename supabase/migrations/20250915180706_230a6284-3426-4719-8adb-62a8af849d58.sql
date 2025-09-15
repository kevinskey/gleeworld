-- Create improved recurring events system
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
  p_description text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_start_date timestamp with time zone,
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
  current_date date;
  occurrence_count integer := 0;
  created_events uuid[] := ARRAY[]::uuid[];
  days_map jsonb := '{"sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4, "friday": 5, "saturday": 6}';
  target_day_numbers integer[];
  current_start_time timestamp with time zone;
  current_end_time timestamp with time zone;
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
  current_date := p_start_date::date;
  
  CASE p_recurring_frequency
    WHEN 'daily' THEN
      -- Daily recurrence
      WHILE current_date <= p_recurring_end_date AND occurrence_count < p_max_occurrences LOOP
        current_date := current_date + (p_recurring_interval || ' days')::interval;
        
        IF current_date <= p_recurring_end_date THEN
          current_start_time := current_date::timestamp + COALESCE(p_start_time, '09:00'::time);
          current_end_time := CASE 
            WHEN p_end_time IS NOT NULL THEN current_date::timestamp + p_end_time
            WHEN p_end_date IS NOT NULL THEN current_start_time + (p_end_date - p_start_date)
            ELSE current_start_time + interval '1 hour'
          END;
          
          INSERT INTO public.events (
            title, description, location, start_date, end_date, start_time, end_time,
            event_type, is_recurring, recurring_parent_id, recurring_occurrence_date, created_by
          ) VALUES (
            p_title, p_description, p_location, current_start_time, current_end_time,
            p_start_time, p_end_time, p_event_type, false, parent_event_id, current_date, p_created_by
          ) RETURNING id INTO new_event_id;
          
          created_events := created_events || new_event_id;
          occurrence_count := occurrence_count + 1;
        END IF;
      END LOOP;
      
    WHEN 'weekly' THEN
      -- Weekly recurrence on specific days
      WHILE current_date <= p_recurring_end_date AND occurrence_count < p_max_occurrences LOOP
        -- Move to next week
        current_date := current_date + (7 * p_recurring_interval || ' days')::interval;
        
        -- Create events for each specified day of the week
        FOR i IN 1..array_length(target_day_numbers, 1) LOOP
          DECLARE
            target_day_num integer := target_day_numbers[i];
            days_to_add integer;
            target_date date;
          BEGIN
            -- Calculate days to add to get to target day
            days_to_add := (target_day_num - extract(dow from current_date)::integer + 7) % 7;
            target_date := current_date + (days_to_add || ' days')::interval;
            
            IF target_date <= p_recurring_end_date AND occurrence_count < p_max_occurrences THEN
              current_start_time := target_date::timestamp + COALESCE(p_start_time, '09:00'::time);
              current_end_time := CASE 
                WHEN p_end_time IS NOT NULL THEN target_date::timestamp + p_end_time
                WHEN p_end_date IS NOT NULL THEN current_start_time + (p_end_date - p_start_date)
                ELSE current_start_time + interval '1 hour'
              END;
              
              INSERT INTO public.events (
                title, description, location, start_date, end_date, start_time, end_time,
                event_type, is_recurring, recurring_parent_id, recurring_occurrence_date, created_by
              ) VALUES (
                p_title, p_description, p_location, current_start_time, current_end_time,
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
      WHILE current_date <= p_recurring_end_date AND occurrence_count < p_max_occurrences LOOP
        current_date := current_date + (p_recurring_interval || ' months')::interval;
        
        IF current_date <= p_recurring_end_date THEN
          current_start_time := current_date::timestamp + COALESCE(p_start_time, '09:00'::time);
          current_end_time := CASE 
            WHEN p_end_time IS NOT NULL THEN current_date::timestamp + p_end_time
            WHEN p_end_date IS NOT NULL THEN current_start_time + (p_end_date - p_start_date)
            ELSE current_start_time + interval '1 hour'
          END;
          
          INSERT INTO public.events (
            title, description, location, start_date, end_date, start_time, end_time,
            event_type, is_recurring, recurring_parent_id, recurring_occurrence_date, created_by
          ) VALUES (
            p_title, p_description, p_location, current_start_time, current_end_time,
            p_start_time, p_end_time, p_event_type, false, parent_event_id, current_date, p_created_by
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

-- Function to update a recurring event series
CREATE OR REPLACE FUNCTION public.update_recurring_events(
  p_parent_event_id uuid,
  p_update_type text DEFAULT 'this_and_future', -- 'this_only', 'this_and_future', 'all'
  p_occurrence_date date DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  CASE p_update_type
    WHEN 'this_only' THEN
      -- Update only the specific occurrence
      UPDATE public.events 
      SET 
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        location = COALESCE(p_location, location),
        start_time = COALESCE(p_start_time, start_time),
        end_time = COALESCE(p_end_time, end_time),
        updated_at = now()
      WHERE recurring_parent_id = p_parent_event_id 
        AND recurring_occurrence_date = p_occurrence_date;
      
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      
    WHEN 'this_and_future' THEN
      -- Update this occurrence and all future occurrences
      UPDATE public.events 
      SET 
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        location = COALESCE(p_location, location),
        start_time = COALESCE(p_start_time, start_time),
        end_time = COALESCE(p_end_time, end_time),
        updated_at = now()
      WHERE recurring_parent_id = p_parent_event_id 
        AND recurring_occurrence_date >= p_occurrence_date;
      
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      
    WHEN 'all' THEN
      -- Update all occurrences including parent
      UPDATE public.events 
      SET 
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        location = COALESCE(p_location, location),
        start_time = COALESCE(p_start_time, start_time),
        end_time = COALESCE(p_end_time, end_time),
        updated_at = now()
      WHERE id = p_parent_event_id OR recurring_parent_id = p_parent_event_id;
      
      GET DIAGNOSTICS updated_count = ROW_COUNT;
  END CASE;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', updated_count,
    'message', 'Successfully updated ' || updated_count || ' events'
  );
END;
$$;

-- Function to delete recurring events
CREATE OR REPLACE FUNCTION public.delete_recurring_events(
  p_parent_event_id uuid,
  p_delete_type text DEFAULT 'this_and_future', -- 'this_only', 'this_and_future', 'all'
  p_occurrence_date date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  CASE p_delete_type
    WHEN 'this_only' THEN
      -- Delete only the specific occurrence
      DELETE FROM public.events 
      WHERE recurring_parent_id = p_parent_event_id 
        AND recurring_occurrence_date = p_occurrence_date;
      
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      
    WHEN 'this_and_future' THEN
      -- Delete this occurrence and all future occurrences
      DELETE FROM public.events 
      WHERE recurring_parent_id = p_parent_event_id 
        AND recurring_occurrence_date >= p_occurrence_date;
      
      -- Update parent event's end date
      UPDATE public.events 
      SET recurring_end_date = p_occurrence_date - interval '1 day'
      WHERE id = p_parent_event_id;
      
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      
    WHEN 'all' THEN
      -- Delete all occurrences including parent
      DELETE FROM public.events 
      WHERE id = p_parent_event_id OR recurring_parent_id = p_parent_event_id;
      
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
  END CASE;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'message', 'Successfully deleted ' || deleted_count || ' events'
  );
END;
$$;
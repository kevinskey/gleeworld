-- Fix the recurring event instances function to properly handle day-of-week selection
CREATE OR REPLACE FUNCTION public.create_recurring_event_instances(
  parent_event_id_param uuid,
  recurrence_type_param text,
  recurrence_interval_param integer DEFAULT 1,
  recurrence_days_of_week_param integer[] DEFAULT NULL,
  recurrence_end_date_param timestamp with time zone DEFAULT NULL,
  max_occurrences_param integer DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  parent_event RECORD;
  next_occurrence_date timestamp with time zone;
  occurrence_end_date timestamp with time zone;
  occurrence_count integer := 0;
  max_count integer;
  duration_interval interval;
  current_week_start timestamp with time zone;
  day_offset integer;
  target_date timestamp with time zone;
BEGIN
  -- Get parent event data
  SELECT * INTO parent_event FROM public.gw_events WHERE id = parent_event_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent event not found';
  END IF;
  
  -- Calculate event duration
  IF parent_event.end_date IS NOT NULL THEN
    duration_interval := parent_event.end_date - parent_event.start_date;
  ELSE
    duration_interval := INTERVAL '1 hour'; -- Default duration
  END IF;
  
  -- Set limits
  max_count := COALESCE(max_occurrences_param, 365); -- Max 365 occurrences
  
  -- Handle weekly recurrence with specific days of week
  IF recurrence_type_param = 'weekly' AND recurrence_days_of_week_param IS NOT NULL AND array_length(recurrence_days_of_week_param, 1) > 0 THEN
    -- Start from the beginning of the week of the parent event
    current_week_start := date_trunc('week', parent_event.start_date);
    
    -- Loop through weeks
    WHILE occurrence_count < max_count LOOP
      -- Move to next week (skip first iteration to avoid duplicating parent event's week if needed)
      current_week_start := current_week_start + (recurrence_interval_param || ' weeks')::interval;
      
      -- Check if we've exceeded the end date
      IF recurrence_end_date_param IS NOT NULL AND current_week_start > recurrence_end_date_param THEN
        EXIT;
      END IF;
      
      -- For each selected day of the week
      FOREACH day_offset IN ARRAY recurrence_days_of_week_param LOOP
        -- Calculate the target date (week start is Monday in PostgreSQL, so adjust for Sunday=0)
        IF day_offset = 0 THEN
          -- Sunday is 6 days after Monday (week start)
          target_date := current_week_start + INTERVAL '6 days';
        ELSE
          -- Monday=1 is 0 days after week start, Tuesday=2 is 1 day, etc.
          target_date := current_week_start + ((day_offset - 1) || ' days')::interval;
        END IF;
        
        -- Preserve the time from the parent event
        target_date := target_date + (parent_event.start_date::time)::interval;
        
        -- Skip if this date is before the parent event
        IF target_date <= parent_event.start_date THEN
          CONTINUE;
        END IF;
        
        -- Check if we've exceeded the end date
        IF recurrence_end_date_param IS NOT NULL AND target_date > recurrence_end_date_param THEN
          CONTINUE;
        END IF;
        
        -- Check if we've hit max occurrences
        IF occurrence_count >= max_count THEN
          EXIT;
        END IF;
        
        -- Calculate end date for this occurrence
        occurrence_end_date := target_date + duration_interval;
        
        -- Create the recurring event instance
        INSERT INTO public.gw_events (
          title, description, event_type, start_date, end_date, location, venue_name, 
          address, max_attendees, registration_required, is_public, status, created_by,
          calendar_id, external_id, external_source, tags, attendance_required, 
          attendance_type, attendance_notes, attendance_deadline, late_arrival_allowed,
          excuse_required, is_private, is_recurring, parent_event_id, image_url
        ) VALUES (
          parent_event.title, parent_event.description, parent_event.event_type, 
          target_date, occurrence_end_date, parent_event.location, parent_event.venue_name,
          parent_event.address, parent_event.max_attendees, parent_event.registration_required,
          parent_event.is_public, parent_event.status, parent_event.created_by,
          parent_event.calendar_id, parent_event.external_id, parent_event.external_source,
          parent_event.tags, parent_event.attendance_required, parent_event.attendance_type,
          parent_event.attendance_notes, 
          CASE 
            WHEN parent_event.attendance_deadline IS NOT NULL THEN 
              target_date + (parent_event.attendance_deadline - parent_event.start_date)
            ELSE NULL 
          END,
          parent_event.late_arrival_allowed, parent_event.excuse_required, 
          parent_event.is_private, false, parent_event_id_param, parent_event.image_url
        );
        
        occurrence_count := occurrence_count + 1;
      END LOOP;
      
      -- Exit if we've hit max occurrences
      IF occurrence_count >= max_count THEN
        EXIT;
      END IF;
    END LOOP;
  ELSE
    -- Original logic for simple daily/weekly/monthly recurrence
    next_occurrence_date := parent_event.start_date;
    
    WHILE occurrence_count < max_count LOOP
      -- Calculate next occurrence date
      CASE recurrence_type_param
        WHEN 'daily' THEN
          next_occurrence_date := next_occurrence_date + (recurrence_interval_param || ' days')::interval;
        WHEN 'weekly' THEN
          next_occurrence_date := next_occurrence_date + (recurrence_interval_param * 7 || ' days')::interval;
        WHEN 'monthly' THEN
          next_occurrence_date := next_occurrence_date + (recurrence_interval_param || ' months')::interval;
        ELSE
          RAISE EXCEPTION 'Invalid recurrence type: %', recurrence_type_param;
      END CASE;
      
      -- Check if we've exceeded the end date
      IF recurrence_end_date_param IS NOT NULL AND next_occurrence_date > recurrence_end_date_param THEN
        EXIT;
      END IF;
      
      -- Calculate end date for this occurrence
      occurrence_end_date := next_occurrence_date + duration_interval;
      
      -- Create the recurring event instance
      INSERT INTO public.gw_events (
        title, description, event_type, start_date, end_date, location, venue_name, 
        address, max_attendees, registration_required, is_public, status, created_by,
        calendar_id, external_id, external_source, tags, attendance_required, 
        attendance_type, attendance_notes, attendance_deadline, late_arrival_allowed,
        excuse_required, is_private, is_recurring, parent_event_id, image_url
      ) VALUES (
        parent_event.title, parent_event.description, parent_event.event_type, 
        next_occurrence_date, occurrence_end_date, parent_event.location, parent_event.venue_name,
        parent_event.address, parent_event.max_attendees, parent_event.registration_required,
        parent_event.is_public, parent_event.status, parent_event.created_by,
        parent_event.calendar_id, parent_event.external_id, parent_event.external_source,
        parent_event.tags, parent_event.attendance_required, parent_event.attendance_type,
        parent_event.attendance_notes, 
        CASE 
          WHEN parent_event.attendance_deadline IS NOT NULL THEN 
            next_occurrence_date + (parent_event.attendance_deadline - parent_event.start_date)
          ELSE NULL 
        END,
        parent_event.late_arrival_allowed, parent_event.excuse_required, 
        parent_event.is_private, false, parent_event_id_param, parent_event.image_url
      );
      
      occurrence_count := occurrence_count + 1;
    END LOOP;
  END IF;
  
  RETURN occurrence_count;
END;
$$;
-- Add recurring event fields to gw_events table
ALTER TABLE public.gw_events ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE public.gw_events ADD COLUMN IF NOT EXISTS recurrence_rule text;
ALTER TABLE public.gw_events ADD COLUMN IF NOT EXISTS recurrence_type text; -- 'daily', 'weekly', 'monthly'
ALTER TABLE public.gw_events ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT 1; -- repeat every X days/weeks/months
ALTER TABLE public.gw_events ADD COLUMN IF NOT EXISTS recurrence_days_of_week integer[]; -- for weekly: [0,1,2,3,4,5,6] where 0=Sunday
ALTER TABLE public.gw_events ADD COLUMN IF NOT EXISTS recurrence_end_date timestamp with time zone;
ALTER TABLE public.gw_events ADD COLUMN IF NOT EXISTS max_occurrences integer;
ALTER TABLE public.gw_events ADD COLUMN IF NOT EXISTS parent_event_id uuid REFERENCES public.gw_events(id) ON DELETE CASCADE;

-- Create index for better performance on recurring events
CREATE INDEX IF NOT EXISTS idx_gw_events_recurring ON public.gw_events(is_recurring, recurrence_type, parent_event_id);
CREATE INDEX IF NOT EXISTS idx_gw_events_parent ON public.gw_events(parent_event_id);

-- Function to create recurring event instances
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
  next_occurrence_date := parent_event.start_date;
  
  -- Generate recurring instances
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
    
    -- For weekly recurrence with specific days, check if current day matches
    IF recurrence_type_param = 'weekly' AND recurrence_days_of_week_param IS NOT NULL THEN
      IF NOT (EXTRACT(DOW FROM next_occurrence_date)::integer = ANY(recurrence_days_of_week_param)) THEN
        CONTINUE;
      END IF;
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
  
  RETURN occurrence_count;
END;
$$;
-- Add recurring appointment fields to gw_appointments table
ALTER TABLE public.gw_appointments 
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_type text DEFAULT null,
ADD COLUMN recurrence_interval integer DEFAULT 1,
ADD COLUMN recurrence_days_of_week integer[] DEFAULT null,
ADD COLUMN recurrence_end_date date DEFAULT null,
ADD COLUMN parent_appointment_id uuid DEFAULT null,
ADD COLUMN max_occurrences integer DEFAULT null;

-- Add comments for clarity
COMMENT ON COLUMN public.gw_appointments.is_recurring IS 'Whether this appointment is part of a recurring series';
COMMENT ON COLUMN public.gw_appointments.recurrence_type IS 'Type of recurrence: daily, weekly, monthly, yearly';
COMMENT ON COLUMN public.gw_appointments.recurrence_interval IS 'Interval between recurrences (e.g., every 2 weeks)';
COMMENT ON COLUMN public.gw_appointments.recurrence_days_of_week IS 'Days of week for weekly recurrence (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN public.gw_appointments.recurrence_end_date IS 'End date for recurring appointments';
COMMENT ON COLUMN public.gw_appointments.parent_appointment_id IS 'References the original appointment in a recurring series';
COMMENT ON COLUMN public.gw_appointments.max_occurrences IS 'Maximum number of occurrences for the recurring series';

-- Create function to generate recurring appointments
CREATE OR REPLACE FUNCTION public.create_recurring_appointments(
  p_appointment_id uuid,
  p_title text,
  p_description text,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_appointment_type text,
  p_duration_minutes integer,
  p_assigned_to uuid,
  p_created_by uuid,
  p_start_date timestamp with time zone,
  p_recurrence_type text,
  p_recurrence_interval integer DEFAULT 1,
  p_recurrence_days_of_week integer[] DEFAULT null,
  p_recurrence_end_date date DEFAULT null,
  p_max_occurrences integer DEFAULT null
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  appointment_count integer := 0;
  current_date timestamp with time zone := p_start_date;
  end_condition_met boolean := false;
  next_date timestamp with time zone;
  i integer;
BEGIN
  -- Set the parent appointment as recurring
  UPDATE public.gw_appointments 
  SET 
    is_recurring = true,
    recurrence_type = p_recurrence_type,
    recurrence_interval = p_recurrence_interval,
    recurrence_days_of_week = p_recurrence_days_of_week,
    recurrence_end_date = p_recurrence_end_date,
    max_occurrences = p_max_occurrences
  WHERE id = p_appointment_id;

  -- Generate recurring appointments
  LOOP
    -- Calculate next occurrence based on recurrence type
    CASE p_recurrence_type
      WHEN 'daily' THEN
        next_date := current_date + (p_recurrence_interval || ' days')::interval;
      WHEN 'weekly' THEN
        IF p_recurrence_days_of_week IS NOT NULL THEN
          -- Find next day in the week pattern
          FOR i IN 1..7 LOOP
            next_date := current_date + (i || ' days')::interval;
            IF EXTRACT(DOW FROM next_date) = ANY(p_recurrence_days_of_week) THEN
              EXIT;
            END IF;
          END LOOP;
        ELSE
          next_date := current_date + (p_recurrence_interval * 7 || ' days')::interval;
        END IF;
      WHEN 'monthly' THEN
        next_date := current_date + (p_recurrence_interval || ' months')::interval;
      WHEN 'yearly' THEN
        next_date := current_date + (p_recurrence_interval || ' years')::interval;
      ELSE
        EXIT; -- Unknown recurrence type
    END CASE;

    -- Check end conditions
    IF p_recurrence_end_date IS NOT NULL AND next_date::date > p_recurrence_end_date THEN
      EXIT;
    END IF;
    
    IF p_max_occurrences IS NOT NULL AND appointment_count >= p_max_occurrences THEN
      EXIT;
    END IF;

    -- Create the recurring appointment
    INSERT INTO public.gw_appointments (
      title, description, client_name, client_email, client_phone,
      appointment_type, duration_minutes, assigned_to, created_by,
      appointment_date, is_recurring, parent_appointment_id, status
    ) VALUES (
      p_title, p_description, p_client_name, p_client_email, p_client_phone,
      p_appointment_type, p_duration_minutes, p_assigned_to, p_created_by,
      next_date, true, p_appointment_id, 'pending_approval'
    );

    appointment_count := appointment_count + 1;
    current_date := next_date;
    
    -- Safety check to prevent infinite loops
    IF appointment_count > 100 THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN appointment_count;
END;
$$;
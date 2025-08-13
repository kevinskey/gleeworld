-- Create the get_booked_audition_slots function if it doesn't exist or replace it
CREATE OR REPLACE FUNCTION public.get_booked_audition_slots(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE(audition_time_slot timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN appointment_date IS NOT NULL AND created_at IS NOT NULL THEN
        -- For existing appointments, estimate the time slot from appointment date
        appointment_date::timestamp + COALESCE(
          EXTRACT(HOUR FROM created_at::time) * INTERVAL '1 hour' +
          EXTRACT(MINUTE FROM created_at::time) * INTERVAL '1 minute',
          INTERVAL '0'
        )
      ELSE 
        appointment_date::timestamp
    END as audition_time_slot
  FROM public.gw_appointments
  WHERE appointment_date IS NOT NULL
    AND appointment_date::timestamp >= p_start::timestamp
    AND appointment_date::timestamp <= p_end::timestamp
    AND status = 'scheduled'
$$;
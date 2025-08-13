-- Fix the get_booked_audition_slots function to check BOTH tables
CREATE OR REPLACE FUNCTION public.get_booked_audition_slots(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE(audition_time_slot timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Get booked slots from both gw_appointments and audition_applications tables
  SELECT appointment_date::timestamptz as audition_time_slot
  FROM public.gw_appointments
  WHERE appointment_date IS NOT NULL
    AND appointment_date::timestamptz >= p_start
    AND appointment_date::timestamptz <= p_end
    AND status = 'scheduled'
    AND (appointment_type ILIKE '%audition%' OR title ILIKE '%audition%')
  
  UNION ALL
  
  SELECT audition_time_slot
  FROM public.audition_applications
  WHERE audition_time_slot IS NOT NULL
    AND audition_time_slot >= p_start
    AND audition_time_slot <= p_end
    AND status IN ('submitted', 'scheduled')
$$;
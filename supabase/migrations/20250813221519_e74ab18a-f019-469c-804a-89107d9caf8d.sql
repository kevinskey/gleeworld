-- Update the get_booked_audition_slots function to work with current schema
CREATE OR REPLACE FUNCTION public.get_booked_audition_slots(p_start timestamptz, p_end timestamptz)
 RETURNS TABLE(audition_time_slot timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  -- Get booked slots from gw_appointments based on appointment_date and time from description
  -- Since we store time in description, we'll parse available appointments
  SELECT (appointment_date + INTERVAL '0 hour')::timestamptz as audition_time_slot
  FROM public.gw_appointments
  WHERE appointment_date IS NOT NULL
    AND appointment_date::timestamptz >= p_start::date
    AND appointment_date::timestamptz <= p_end::date
    AND status = 'scheduled'
    AND appointment_type = 'New Member Audition'
  
  UNION ALL
  
  -- Get booked slots from audition_applications if they have time slots
  SELECT audition_time_slot
  FROM public.audition_applications
  WHERE audition_time_slot IS NOT NULL
    AND audition_time_slot >= p_start
    AND audition_time_slot <= p_end
    AND status IN ('submitted', 'scheduled');
$function$
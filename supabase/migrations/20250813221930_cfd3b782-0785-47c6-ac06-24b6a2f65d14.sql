-- Drop the existing function and recreate with auditioner names
DROP FUNCTION IF EXISTS public.get_booked_audition_slots(timestamptz, timestamptz);

-- Create the updated function to include auditioner names
CREATE OR REPLACE FUNCTION public.get_booked_audition_slots(p_start timestamptz, p_end timestamptz)
 RETURNS TABLE(audition_time_slot timestamptz, auditioner_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  -- Get booked slots from gw_appointments with client names
  SELECT 
    (appointment_date + INTERVAL '0 hour')::timestamptz as audition_time_slot,
    client_name as auditioner_name
  FROM public.gw_appointments
  WHERE appointment_date IS NOT NULL
    AND appointment_date::timestamptz >= p_start::date
    AND appointment_date::timestamptz <= p_end::date
    AND status = 'scheduled'
    AND appointment_type = 'New Member Audition'
  
  UNION ALL
  
  -- Get booked slots from audition_applications with full names
  SELECT 
    audition_time_slot,
    full_name as auditioner_name
  FROM public.audition_applications
  WHERE audition_time_slot IS NOT NULL
    AND audition_time_slot >= p_start
    AND audition_time_slot <= p_end
    AND status IN ('submitted', 'scheduled');
$function$
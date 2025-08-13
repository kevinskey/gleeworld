-- Fix the RPC function with correct column names
CREATE OR REPLACE FUNCTION get_booked_audition_slots(selected_date date)
RETURNS TABLE (
  auditioner_name text,
  audition_time_slot timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aa.full_name as auditioner_name,
    aa.audition_time_slot
  FROM audition_applications aa
  WHERE DATE(aa.audition_time_slot) = selected_date
  AND aa.status != 'cancelled'
  
  UNION ALL
  
  SELECT 
    ga.client_name as auditioner_name,
    (ga.appointment_date || ' 12:00:00')::timestamp with time zone as audition_time_slot
  FROM gw_appointments ga
  WHERE ga.appointment_type = 'audition'
  AND ga.appointment_date = selected_date::text
  AND ga.status != 'cancelled';
END;
$$;
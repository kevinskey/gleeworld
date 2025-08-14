-- Create RPC function to get booked audition slots
CREATE OR REPLACE FUNCTION public.get_booked_audition_slots(p_start timestamp with time zone, p_end timestamp with time zone)
RETURNS TABLE(audition_time_slot timestamp with time zone, auditioner_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aa.audition_time_slot,
    aa.full_name as auditioner_name
  FROM public.audition_applications aa
  WHERE aa.audition_time_slot IS NOT NULL
    AND aa.audition_time_slot >= p_start
    AND aa.audition_time_slot <= p_end
    AND aa.status != 'cancelled'
  ORDER BY aa.audition_time_slot;
END;
$$;
-- Create RPC to fetch booked audition slots within a time range, bypassing RLS safely
CREATE OR REPLACE FUNCTION public.get_booked_audition_slots(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE (
  audition_time_slot timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT audition_time_slot
  FROM public.audition_applications
  WHERE audition_time_slot IS NOT NULL
    AND audition_time_slot >= p_start
    AND audition_time_slot <= p_end
    AND COALESCE(status, 'submitted') NOT IN ('cancelled', 'withdrawn');
$$;

-- Allow both anonymous and authenticated clients to execute this function
GRANT EXECUTE ON FUNCTION public.get_booked_audition_slots(timestamptz, timestamptz) TO anon, authenticated;

-- Optional: document the function
COMMENT ON FUNCTION public.get_booked_audition_slots(timestamptz, timestamptz)
IS 'Returns booked audition_time_slot values between p_start and p_end (inclusive), safe for public use via SECURITY DEFINER.';
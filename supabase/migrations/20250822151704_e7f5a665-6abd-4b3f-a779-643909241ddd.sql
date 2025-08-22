-- Fix the ambiguous column reference in get_available_time_slots function
CREATE OR REPLACE FUNCTION public.get_available_time_slots(p_service_id uuid, p_date date)
RETURNS TABLE(start_time time, end_time time, available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    service_duration integer;
    day_of_week_param integer;
BEGIN
    -- Get the day of week for the given date (0=Sunday, 1=Monday, etc.)
    day_of_week_param := EXTRACT(DOW FROM p_date);
    
    -- Get service duration
    SELECT duration_minutes INTO service_duration
    FROM gw_services 
    WHERE id = p_service_id;
    
    -- If no service found, return empty result
    IF service_duration IS NULL THEN
        RETURN;
    END IF;
    
    -- Get availability slots for this service and day
    RETURN QUERY
    SELECT 
        sa.start_time,
        sa.end_time,
        NOT EXISTS (
            SELECT 1 FROM gw_appointments ga
            WHERE ga.service_id = p_service_id 
            AND ga.appointment_date::date = p_date
            AND ga.start_time = sa.start_time
            AND ga.status != 'cancelled'
        ) as available
    FROM gw_service_availability sa
    WHERE sa.service_id = p_service_id
    AND sa.day_of_week = day_of_week_param
    AND sa.is_active = true
    ORDER BY sa.start_time;
    
END;
$function$;
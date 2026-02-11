
-- Generate individual time slots from availability windows
CREATE OR REPLACE FUNCTION public.get_available_time_slots(p_service_id uuid, p_date date)
RETURNS TABLE(start_time time, end_time time, available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    service_duration integer;
    day_of_week_param integer;
    service_name_val text;
    avail_rec RECORD;
    slot_start time;
    slot_end time;
    current_et TIMESTAMPTZ;
    current_date_et DATE;
    current_time_et TIME;
    is_booked boolean;
BEGIN
    day_of_week_param := EXTRACT(DOW FROM p_date);
    
    -- Get current ET time for filtering past slots on today
    current_et := NOW() AT TIME ZONE 'America/New_York';
    current_date_et := current_et::DATE;
    current_time_et := current_et::TIME;
    
    -- Get service duration and name
    SELECT s.duration_minutes, s.name INTO service_duration, service_name_val
    FROM gw_services s
    WHERE s.id = p_service_id;
    
    IF service_duration IS NULL THEN
        RETURN;
    END IF;
    
    -- Loop through availability windows and generate individual slots
    FOR avail_rec IN
        SELECT sa.start_time as window_start, sa.end_time as window_end
        FROM gw_service_availability sa
        WHERE sa.service_id = p_service_id
        AND sa.day_of_week = day_of_week_param
        AND sa.is_active = true
        ORDER BY sa.start_time
    LOOP
        slot_start := avail_rec.window_start;
        
        WHILE slot_start + (service_duration || ' minutes')::INTERVAL <= avail_rec.window_end LOOP
            slot_end := slot_start + (service_duration || ' minutes')::INTERVAL;
            
            -- Skip past slots if booking for today
            IF p_date = current_date_et AND slot_start < current_time_et THEN
                slot_start := slot_end;
                CONTINUE;
            END IF;
            
            -- Check if this slot is booked
            SELECT EXISTS (
                SELECT 1 FROM gw_appointments ga
                WHERE ga.appointment_date::date = p_date
                AND ga.status NOT IN ('cancelled')
                AND (ga.appointment_date AT TIME ZONE 'America/New_York')::time = slot_start
            ) INTO is_booked;
            
            start_time := slot_start;
            end_time := slot_end;
            available := NOT is_booked;
            RETURN NEXT;
            
            slot_start := slot_end;
        END LOOP;
    END LOOP;
END;
$function$;

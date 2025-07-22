-- Update all events to the correct academic year 2025-2026
UPDATE public.gw_events 
SET start_date = start_date + INTERVAL '1 year',
    end_date = CASE 
        WHEN end_date IS NOT NULL THEN end_date + INTERVAL '1 year'
        ELSE NULL 
    END
WHERE calendar_id = (SELECT id FROM public.gw_calendars WHERE name = 'Spelman');
-- Activate services in gw_services table so appointments can be booked
UPDATE public.gw_services 
SET is_active = true, updated_at = now()
WHERE is_active = false;

-- Also ensure we have some basic service availability for the current services
-- Add availability for weekdays (Monday to Friday) from 9 AM to 5 PM
INSERT INTO public.gw_service_availability (service_id, day_of_week, start_time, end_time, is_active)
SELECT 
  s.id as service_id,
  day_of_week,
  '09:00'::time as start_time,
  '17:00'::time as end_time,
  true as is_active
FROM public.gw_services s
CROSS JOIN generate_series(1, 5) as day_of_week  -- Monday to Friday
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_service_availability sa 
  WHERE sa.service_id = s.id AND sa.day_of_week = day_of_week
);
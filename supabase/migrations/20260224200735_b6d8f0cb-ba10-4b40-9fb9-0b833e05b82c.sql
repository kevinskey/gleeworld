-- Add per-city logistics columns to gw_tour_cities
ALTER TABLE public.gw_tour_cities
ADD COLUMN IF NOT EXISTS departure_time text,
ADD COLUMN IF NOT EXISTS arrival_time text,
ADD COLUMN IF NOT EXISTS meals_needed text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS meal_notes text,
ADD COLUMN IF NOT EXISTS estimated_drive_hours numeric,
ADD COLUMN IF NOT EXISTS estimated_drive_miles numeric,
ADD COLUMN IF NOT EXISTS lunch_stop_suggestion jsonb;

COMMENT ON COLUMN public.gw_tour_cities.departure_time IS 'Departure time from this city (e.g. 08:00)';
COMMENT ON COLUMN public.gw_tour_cities.arrival_time IS 'Arrival time at this city (e.g. 14:00)';
COMMENT ON COLUMN public.gw_tour_cities.meals_needed IS 'Array of meals needed at this stop: breakfast, lunch, dinner';
COMMENT ON COLUMN public.gw_tour_cities.meal_notes IS 'Notes about meal arrangements for this city';
COMMENT ON COLUMN public.gw_tour_cities.estimated_drive_hours IS 'Estimated driving hours from previous city';
COMMENT ON COLUMN public.gw_tour_cities.estimated_drive_miles IS 'Estimated driving miles from previous city';
COMMENT ON COLUMN public.gw_tour_cities.lunch_stop_suggestion IS 'AI-suggested lunch stop info (name, address, capacity, etc.)';
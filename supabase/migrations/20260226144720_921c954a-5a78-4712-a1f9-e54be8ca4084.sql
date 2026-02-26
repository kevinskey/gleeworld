
-- Add route analysis columns to gw_tour_cities
ALTER TABLE public.gw_tour_cities
  ADD COLUMN IF NOT EXISTS toll_estimate NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parking_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS route_analysis JSONB DEFAULT NULL;

-- route_analysis will store: { suggested_route, toll_details, parking_options, dot_warnings, fuel_estimate, notes }

COMMENT ON COLUMN public.gw_tour_cities.toll_estimate IS 'Estimated toll costs for the leg to this city';
COMMENT ON COLUMN public.gw_tour_cities.parking_notes IS 'Charter bus parking info at this city';
COMMENT ON COLUMN public.gw_tour_cities.route_analysis IS 'Full AI route analysis JSON for the leg to this city';

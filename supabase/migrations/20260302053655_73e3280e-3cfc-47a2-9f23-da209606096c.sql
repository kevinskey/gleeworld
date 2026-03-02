
-- Fix gw_tour_cities: allow all authenticated users to view cities for active tours
DROP POLICY IF EXISTS "Users can view cities for tours they're participating in" ON gw_tour_cities;

CREATE POLICY "Authenticated users can view tour cities for active tours"
ON gw_tour_cities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_tours t
    WHERE t.id = gw_tour_cities.tour_id
    AND t.status IN ('planning', 'confirmed', 'active')
  )
);

-- Fix gw_tour_logistics: allow all authenticated users to view logistics for active tours
DROP POLICY IF EXISTS "Users can view logistics for tours they're participating in" ON gw_tour_logistics;

CREATE POLICY "Authenticated users can view tour logistics for active tours"
ON gw_tour_logistics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_tour_cities tc
    JOIN gw_tours t ON tc.tour_id = t.id
    WHERE tc.id = gw_tour_logistics.tour_city_id
    AND t.status IN ('planning', 'confirmed', 'active')
  )
);

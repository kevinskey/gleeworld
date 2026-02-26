-- Move Baltimore to Sunday Mar 15, right after Flint (Mar 14)
UPDATE gw_tour_cities 
SET arrival_date = '2026-03-15', city_order = 7
WHERE id = '9a5f5071-307b-4d4b-9168-a22d9e92b8d4';

-- Bump Flint to order 6
UPDATE gw_tour_cities 
SET city_order = 6
WHERE id = '450ca12a-73b4-477a-a203-aa60513ed8ab';

-- Bump New Brunswick to order 8
UPDATE gw_tour_cities 
SET city_order = 8
WHERE id = 'fbed01e2-4ad5-464c-9065-f41aa1875988';

-- New York order 9 (already correct)
-- Update tour end_date to match latest city
UPDATE gw_tours 
SET end_date = '2026-03-17'
WHERE id = '455d511d-3630-4605-9140-84ed6f562b4c';
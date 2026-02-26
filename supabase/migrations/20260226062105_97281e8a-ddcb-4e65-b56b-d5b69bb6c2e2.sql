-- Add Atlanta return stop (order 10, arriving Mar 18 after departing NYC)
INSERT INTO gw_tour_cities (tour_id, city_name, state_code, city_order, arrival_date)
VALUES ('455d511d-3630-4605-9140-84ed6f562b4c', 'Atlanta', 'Georgia', 10, '2026-03-18');

-- Ensure tour end_date reflects return to Atlanta
UPDATE gw_tours 
SET end_date = '2026-03-18'
WHERE id = '455d511d-3630-4605-9140-84ed6f562b4c';
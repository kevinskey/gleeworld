-- Add missing Flint, MI stop
INSERT INTO gw_tour_cities (tour_id, city_name, state_code, city_order, arrival_date, city_notes, country_code)
VALUES ('455d511d-3630-4605-9140-84ed6f562b4c', 'Flint', 'Michigan', 7, '2026-03-14', 'TBD', 'US');

-- Fix Huntsville state_code typo
UPDATE gw_tour_cities SET state_code = 'Alabama' WHERE id = 'a1311323-8536-4578-9f7c-7cffb91cb38e';

-- Fix city_order to match chronological date order
-- Baltimore goes from order 6 -> 10 (last stop, Mar 18)
UPDATE gw_tour_cities SET city_order = 10 WHERE id = '9a5f5071-307b-4d4b-9168-a22d9e92b8d4';
-- New Brunswick stays at 8 (Mar 16)
UPDATE gw_tour_cities SET city_order = 8 WHERE id = 'fbed01e2-4ad5-464c-9065-f41aa1875988';
-- New York stays at 9 (Mar 17)
UPDATE gw_tour_cities SET city_order = 9 WHERE id = '2a8e8aa3-1a9c-45b4-94af-5c9884ec38e2';

-- Fix tour start_date and end_date to match actual city dates
UPDATE gw_tours 
SET start_date = '2026-03-07', end_date = '2026-03-18'
WHERE id = '455d511d-3630-4605-9140-84ed6f562b4c';
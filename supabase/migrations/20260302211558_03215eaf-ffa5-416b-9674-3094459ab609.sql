
-- Fix Huntsville: March 7
UPDATE gw_tour_cities SET arrival_date = '2026-03-07' WHERE id = 'c0cb0816-38e4-4105-bb64-ca2645cf2419';

-- Fix Kansas City: March 8-9
UPDATE gw_tour_cities SET arrival_date = '2026-03-08', departure_date = '2026-03-09' WHERE id = '209bbbcc-d46e-49dc-8211-2b1ac308dc56';

-- Fix Chicago: March 10-11
UPDATE gw_tour_cities SET arrival_date = '2026-03-10', departure_date = '2026-03-11' WHERE id = '9fa55a27-3632-4fa5-810b-bf422899ab1b';

-- Kalamazoo: March 12 (already correct)
-- Detroit: March 13 (already correct)
-- Flint: March 14 (already correct)

-- Fix Baltimore -> Columbia, Maryland: March 15
UPDATE gw_tour_cities SET city_name = 'Columbia' WHERE id = '4a48d042-3647-48ee-80f9-9129dcb198f8';

-- New Brunswick NJ: March 16 (already correct)
-- New York: March 17 (already correct)
-- Atlanta: March 18 (already correct)

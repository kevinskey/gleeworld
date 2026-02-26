-- Update New York departure_date to Mar 18 and adjust tour end_date
UPDATE gw_tour_cities 
SET departure_date = '2026-03-18'
WHERE id = '2a8e8aa3-1a9c-45b4-94af-5c9884ec38e2';

UPDATE gw_tours 
SET end_date = '2026-03-18'
WHERE id = '455d511d-3630-4605-9140-84ed6f562b4c';
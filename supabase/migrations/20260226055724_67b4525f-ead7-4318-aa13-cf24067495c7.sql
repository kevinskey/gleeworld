-- Delete the duplicate origin Atlanta entry
DELETE FROM gw_tour_cities WHERE id = 'be41a033-50ed-4234-b63c-61e1aff4051f';

-- Update the remaining Atlanta to include origin note  
UPDATE gw_tour_cities 
SET city_notes = 'Origin / Departure City'
WHERE id = 'e72a44ba-b06c-493f-a373-82e5a2b400b2';
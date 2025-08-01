-- Update pearl items to reflect that they come in sets
UPDATE wardrobe_items 
SET name = 'Pearl Necklace Set'
WHERE name = 'Pearl Necklace';

UPDATE wardrobe_items 
SET name = 'Pearl Earring Set' 
WHERE name = 'Pearl Earrings';

-- Add any other pearl items as sets if they exist
UPDATE wardrobe_items 
SET name = 'Pearl Bracelet Set'
WHERE name = 'Pearl Bracelet';
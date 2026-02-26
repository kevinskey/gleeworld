-- Set a default inventory quantity for products that have null inventory
UPDATE gw_products SET inventory_quantity = 100 WHERE inventory_quantity IS NULL;

-- Set a default so future products don't have null inventory
ALTER TABLE gw_products ALTER COLUMN inventory_quantity SET DEFAULT 100;
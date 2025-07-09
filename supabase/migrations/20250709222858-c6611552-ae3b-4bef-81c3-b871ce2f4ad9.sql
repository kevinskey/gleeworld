-- Make title column nullable in gw_hero_slides table
ALTER TABLE gw_hero_slides ALTER COLUMN title DROP NOT NULL;
-- Add mobile and iPad image fields to gw_hero_slides table
ALTER TABLE gw_hero_slides 
ADD COLUMN mobile_image_url TEXT NULL,
ADD COLUMN ipad_image_url TEXT NULL;

-- Add comments to document the new columns
COMMENT ON COLUMN gw_hero_slides.mobile_image_url IS 'Hero image optimized for mobile devices (portrait orientation)';
COMMENT ON COLUMN gw_hero_slides.ipad_image_url IS 'Hero image optimized for iPad/tablet devices';
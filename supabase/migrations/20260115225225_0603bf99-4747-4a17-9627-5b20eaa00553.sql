-- Add music_links JSONB column to lh100_module_resources for structured music selection data
ALTER TABLE lh100_module_resources 
ADD COLUMN IF NOT EXISTS music_links JSONB DEFAULT NULL;

-- Add readings_date column for dynamic USCCB readings links
ALTER TABLE lh100_module_resources 
ADD COLUMN IF NOT EXISTS readings_date DATE DEFAULT NULL;

-- Update existing Music Selection resources with sample music_links structure
UPDATE lh100_module_resources 
SET music_links = '{
  "prelude": null,
  "opening_song": null,
  "responsorial_psalm": null,
  "preparation_hymn": null,
  "communion_hymn": null,
  "recessional": null,
  "soundcloud_playlist": null
}'::jsonb
WHERE title = 'Music Selection' AND resource_type = 'audio';

-- Add comment for documentation
COMMENT ON COLUMN lh100_module_resources.music_links IS 'JSONB containing YouTube links for prelude, opening_song, responsorial_psalm, preparation_hymn, communion_hymn, recessional, and soundcloud_playlist';
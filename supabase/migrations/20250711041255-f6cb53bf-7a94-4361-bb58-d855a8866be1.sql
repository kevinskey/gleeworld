-- Add new fields for enhanced hero slide customization
ALTER TABLE gw_hero_slides 
ADD COLUMN IF NOT EXISTS title_position_horizontal text DEFAULT 'center',
ADD COLUMN IF NOT EXISTS title_position_vertical text DEFAULT 'middle',
ADD COLUMN IF NOT EXISTS description_position_horizontal text DEFAULT 'center',
ADD COLUMN IF NOT EXISTS description_position_vertical text DEFAULT 'middle',
ADD COLUMN IF NOT EXISTS title_size text DEFAULT 'large',
ADD COLUMN IF NOT EXISTS description_size text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS action_button_text text,
ADD COLUMN IF NOT EXISTS action_button_url text,
ADD COLUMN IF NOT EXISTS action_button_enabled boolean DEFAULT false;
-- Add layout and transition columns to gw_hero_slides for enhanced carousel functionality
ALTER TABLE gw_hero_slides 
ADD COLUMN IF NOT EXISTS layout text DEFAULT 'one' CHECK (layout IN ('one', 'two', 'three')),
ADD COLUMN IF NOT EXISTS transition text DEFAULT 'fade' CHECK (transition IN ('fade', 'left', 'right', 'up', 'down', 'zoom'));

-- Add comment for documentation
COMMENT ON COLUMN gw_hero_slides.layout IS 'Number of columns: one, two, or three';
COMMENT ON COLUMN gw_hero_slides.transition IS 'Transition type: fade, left, right, up, down, zoom';
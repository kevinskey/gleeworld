-- Add is_published column for visibility control (separate from is_active which indicates current week)
ALTER TABLE mus240_module_settings 
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

-- Set first 3 weeks as published (visible), rest as unpublished
UPDATE mus240_module_settings 
SET is_published = (week_number <= 3);

-- Fix is_active to only be true for the current week (week 3 based on date 2026-02-05)
UPDATE mus240_module_settings 
SET is_active = (CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date);

-- Add comment for clarity
COMMENT ON COLUMN mus240_module_settings.is_published IS 'Controls student visibility. True = students can see this module.';
COMMENT ON COLUMN mus240_module_settings.is_active IS 'Indicates if this is the current active week based on dates.';
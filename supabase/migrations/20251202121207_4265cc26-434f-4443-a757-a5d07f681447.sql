-- Add theme preference column to gw_profiles table
ALTER TABLE gw_profiles 
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'glee-world';

-- Add check constraint to ensure valid theme values
ALTER TABLE gw_profiles 
ADD CONSTRAINT valid_theme_preference 
CHECK (theme_preference IN ('glee-world', 'spelman-blue', 'spelhouse', 'music'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_gw_profiles_theme_preference 
ON gw_profiles(theme_preference);

-- Add comment explaining the column
COMMENT ON COLUMN gw_profiles.theme_preference IS 
'User selected visual theme for their dashboard. Options: glee-world (default), spelman-blue, spelhouse, music';
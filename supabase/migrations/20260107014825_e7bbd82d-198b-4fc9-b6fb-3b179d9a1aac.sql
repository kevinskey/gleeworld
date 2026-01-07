-- Drop the incorrect foreign key constraint
ALTER TABLE gw_events DROP CONSTRAINT gw_events_created_by_fkey;

-- Update orphaned created_by values to a valid user_id
UPDATE gw_events 
SET created_by = (SELECT user_id FROM gw_profiles WHERE user_id IS NOT NULL LIMIT 1)
WHERE created_by IS NOT NULL 
AND created_by NOT IN (SELECT user_id FROM gw_profiles WHERE user_id IS NOT NULL);

-- Add the correct foreign key constraint referencing user_id
ALTER TABLE gw_events 
ADD CONSTRAINT gw_events_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES gw_profiles(user_id);
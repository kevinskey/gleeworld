-- Clean up existing null user_id records in gw_profiles
DELETE FROM gw_profiles WHERE user_id IS NULL;

-- Add a NOT NULL constraint to prevent future null user_id entries
ALTER TABLE gw_profiles ALTER COLUMN user_id SET NOT NULL;

-- Also clean up any orphaned permission records that might reference these deleted profiles
DELETE FROM gw_module_permissions WHERE user_id NOT IN (SELECT user_id FROM gw_profiles WHERE user_id IS NOT NULL);
-- Update the midterm test to have a created_by value (set to the first admin user if possible)
-- This ensures proper RLS policy enforcement
UPDATE glee_academy_tests 
SET created_by = (
  SELECT user_id 
  FROM gw_profiles 
  WHERE is_admin = true OR is_super_admin = true 
  LIMIT 1
)
WHERE id = '49ef07f7-0bdf-4a42-80ee-06006e2f5107' AND created_by IS NULL;
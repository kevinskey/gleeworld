-- Update Allana's role from 'fan' to 'member' so she can access the executive board dashboard
UPDATE gw_profiles 
SET role = 'member' 
WHERE user_id = 'c9260ed4-144d-439b-be51-bd0f387b5ae6';

-- Also update in the main profiles table for consistency
UPDATE profiles 
SET role = 'member' 
WHERE id = 'c9260ed4-144d-439b-be51-bd0f387b5ae6';
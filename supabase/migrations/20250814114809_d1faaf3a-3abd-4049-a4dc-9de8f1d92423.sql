-- Create a function to sync auditioner names from applications to profiles
CREATE OR REPLACE FUNCTION sync_auditioner_names_from_applications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update gw_profiles with names from audition_applications where names are missing
  UPDATE gw_profiles 
  SET 
    full_name = aa.full_name,
    updated_at = now()
  FROM audition_applications aa
  WHERE gw_profiles.user_id = aa.user_id
    AND gw_profiles.role = 'auditioner'
    AND (gw_profiles.full_name IS NULL OR gw_profiles.full_name = '' OR gw_profiles.full_name != aa.full_name)
    AND aa.full_name IS NOT NULL 
    AND aa.full_name != '';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;
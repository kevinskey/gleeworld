-- Create function to convert auditioner application images to avatar images
CREATE OR REPLACE FUNCTION convert_auditioner_images_to_avatars()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  auditioner_record RECORD;
  updated_count INTEGER := 0;
  avatar_filename TEXT;
  new_avatar_url TEXT;
  file_extension TEXT;
BEGIN
  -- Loop through auditioners with profile images but no avatar
  FOR auditioner_record IN 
    SELECT 
      aa.user_id,
      aa.profile_image_url,
      aa.full_name,
      gp.email
    FROM audition_applications aa
    JOIN gw_profiles gp ON aa.user_id = gp.user_id
    WHERE aa.profile_image_url IS NOT NULL
    AND gp.role = 'auditioner'
    AND (gp.avatar_url IS NULL OR gp.avatar_url = '')
  LOOP
    -- Extract file extension from the original URL
    file_extension := 'jpg'; -- Default to jpg since most audition images are jpg
    
    -- Generate new avatar filename
    avatar_filename := 'avatar-' || auditioner_record.user_id || '.' || file_extension;
    
    -- Create the new avatar URL (public bucket, so no signed URL needed)
    new_avatar_url := 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/avatars/' || avatar_filename;
    
    -- Update the user profile with the new avatar URL
    UPDATE gw_profiles 
    SET 
      avatar_url = new_avatar_url,
      updated_at = now()
    WHERE user_id = auditioner_record.user_id;
    
    updated_count := updated_count + 1;
    
    -- Log the conversion for debugging
    RAISE NOTICE 'Converted avatar for user %: % -> %', 
      auditioner_record.full_name, 
      auditioner_record.profile_image_url, 
      new_avatar_url;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

-- Create a function to get auditioner application images for manual copying
CREATE OR REPLACE FUNCTION get_auditioner_images_for_conversion()
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  email TEXT,
  source_image_url TEXT,
  suggested_avatar_filename TEXT,
  target_avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    aa.user_id,
    aa.full_name,
    gp.email,
    aa.profile_image_url,
    'avatar-' || aa.user_id || '.jpg' as suggested_avatar_filename,
    'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/avatars/avatar-' || aa.user_id || '.jpg' as target_avatar_url
  FROM audition_applications aa
  JOIN gw_profiles gp ON aa.user_id = gp.user_id
  WHERE aa.profile_image_url IS NOT NULL
  AND gp.role = 'auditioner'
  AND (gp.avatar_url IS NULL OR gp.avatar_url = '')
  ORDER BY aa.full_name;
$$;
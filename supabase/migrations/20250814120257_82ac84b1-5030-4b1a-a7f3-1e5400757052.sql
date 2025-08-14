-- Update the conversion function to handle both audition tables
CREATE OR REPLACE FUNCTION public.convert_auditioner_images_to_avatars()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_count INTEGER := 0;
  auditioner_record RECORD;
  avatar_filename TEXT;
BEGIN
  -- Update profiles from audition_applications
  FOR auditioner_record IN 
    SELECT user_id, profile_image_url 
    FROM audition_applications 
    WHERE profile_image_url IS NOT NULL
  LOOP
    -- Generate avatar filename from timestamp
    avatar_filename := auditioner_record.user_id::text || '/avatar-' || EXTRACT(EPOCH FROM NOW())::bigint || '.jpg';
    
    UPDATE gw_profiles 
    SET avatar_url = 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/avatars/' || avatar_filename,
        updated_at = NOW()
    WHERE user_id = auditioner_record.user_id;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  -- Update profiles from gw_auditions
  FOR auditioner_record IN 
    SELECT user_id, selfie_url 
    FROM gw_auditions 
    WHERE selfie_url IS NOT NULL
  LOOP
    -- Generate avatar filename from timestamp
    avatar_filename := auditioner_record.user_id::text || '/avatar-' || EXTRACT(EPOCH FROM NOW())::bigint || '.jpg';
    
    UPDATE gw_profiles 
    SET avatar_url = 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/avatars/' || avatar_filename,
        updated_at = NOW()
    WHERE user_id = auditioner_record.user_id;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$;
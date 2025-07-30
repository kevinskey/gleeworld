-- Fix existing avatar URL for user who has uploaded avatar
UPDATE gw_profiles 
SET avatar_url = 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/user-files/avatars/4e6c2ec0-1f83-449a-a984-8920f6056ab5.jpg'
WHERE user_id = '4e6c2ec0-1f83-449a-a984-8920f6056ab5';

-- Create a function to get the proper avatar URL from storage
CREATE OR REPLACE FUNCTION public.get_avatar_url(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    avatar_path TEXT;
    base_url TEXT := 'https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/user-files/';
BEGIN
    -- Check if user has an avatar in storage
    SELECT name INTO avatar_path
    FROM storage.objects 
    WHERE bucket_id = 'user-files' 
    AND owner = user_id_param::text 
    AND name LIKE 'avatars/%'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Return full URL if avatar exists
    IF avatar_path IS NOT NULL THEN
        RETURN base_url || avatar_path;
    END IF;
    
    -- Return null if no avatar found
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Fix the search path for the get_avatar_url function to address security warning
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
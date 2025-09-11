-- Fix duplicate gw_profiles inserts caused by two auth.users triggers
-- Ensure handle_new_user_profile avoids unique violation on gw_profiles.user_id
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    signup_context TEXT;
BEGIN
    -- Check signup context from user metadata
    signup_context := NEW.raw_user_meta_data ->> 'signup_context';

    INSERT INTO public.gw_profiles (
        user_id,
        email,
        full_name,
        first_name,
        last_name,
        role,
        verified
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name',
        CASE 
            WHEN signup_context = 'audition' THEN 'auditioner'
            WHEN signup_context = 'fan' THEN 'fan'
            WHEN signup_context = 'alumna' THEN 'alumna'
            ELSE 'fan' -- Default fallback
        END,
        false
    )
    ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate entries when multiple triggers run

    RETURN NEW;
END;
$function$;
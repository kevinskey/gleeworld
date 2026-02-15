
-- Backfill gw_profiles first_name, last_name, and display_name from auth.users metadata
UPDATE public.gw_profiles p
SET 
  first_name = COALESCE(p.first_name, split_part(u.raw_user_meta_data->>'full_name', ' ', 1)),
  last_name = COALESCE(p.last_name, 
    CASE 
      WHEN array_length(string_to_array(u.raw_user_meta_data->>'full_name', ' '), 1) > 1 
      THEN substring(u.raw_user_meta_data->>'full_name' from position(' ' in u.raw_user_meta_data->>'full_name') + 1)
      ELSE NULL 
    END
  ),
  display_name = COALESCE(p.display_name, u.raw_user_meta_data->>'full_name')
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.display_name IS NULL OR p.first_name IS NULL)
  AND u.raw_user_meta_data->>'full_name' IS NOT NULL
  AND u.raw_user_meta_data->>'full_name' != '';

-- Also create/update a trigger to auto-populate names on new profile creation
CREATE OR REPLACE FUNCTION public.sync_profile_name_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_name IS NULL OR NEW.first_name IS NULL THEN
    SELECT 
      COALESCE(NEW.first_name, split_part(raw_user_meta_data->>'full_name', ' ', 1)),
      COALESCE(NEW.last_name, 
        CASE 
          WHEN array_length(string_to_array(raw_user_meta_data->>'full_name', ' '), 1) > 1 
          THEN substring(raw_user_meta_data->>'full_name' from position(' ' in raw_user_meta_data->>'full_name') + 1)
          ELSE NULL 
        END
      ),
      COALESCE(NEW.display_name, raw_user_meta_data->>'full_name')
    INTO NEW.first_name, NEW.last_name, NEW.display_name
    FROM auth.users
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_profile_name_trigger ON public.gw_profiles;
CREATE TRIGGER sync_profile_name_trigger
  BEFORE INSERT ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_name_from_auth();

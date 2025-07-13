-- First, add the unique constraint on user_id
ALTER TABLE public.gw_profiles ADD CONSTRAINT gw_profiles_user_id_unique UNIQUE (user_id);

-- Drop and recreate the sync function with correct conflict handling
DROP FUNCTION IF EXISTS sync_profile_to_gw_profile() CASCADE;

CREATE OR REPLACE FUNCTION sync_profile_to_gw_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert into gw_profiles when profiles changes
  INSERT INTO public.gw_profiles (
    user_id, email, full_name, first_name, last_name, phone, created_at, updated_at
  ) VALUES (
    NEW.id, 
    NEW.email, 
    NEW.full_name,
    SPLIT_PART(NEW.full_name, ' ', 1),
    SPLIT_PART(NEW.full_name, ' ', 2),
    NEW.phone_number,
    NEW.created_at,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER sync_profiles_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_gw_profile();
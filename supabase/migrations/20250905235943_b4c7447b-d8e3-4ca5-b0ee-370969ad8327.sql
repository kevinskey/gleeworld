-- Add missing wardrobe-related columns to gw_profiles table to sync with wardrobe mistress data
ALTER TABLE public.gw_profiles 
ADD COLUMN IF NOT EXISTS formal_dress_size TEXT,
ADD COLUMN IF NOT EXISTS polo_size TEXT,
ADD COLUMN IF NOT EXISTS tshirt_size TEXT,
ADD COLUMN IF NOT EXISTS lipstick_shade TEXT,
ADD COLUMN IF NOT EXISTS pearl_status TEXT DEFAULT 'unassigned';

-- Add helpful comments
COMMENT ON COLUMN public.gw_profiles.formal_dress_size IS 'Formal dress size for performances';
COMMENT ON COLUMN public.gw_profiles.polo_size IS 'Polo shirt size';
COMMENT ON COLUMN public.gw_profiles.tshirt_size IS 'T-shirt size';
COMMENT ON COLUMN public.gw_profiles.lipstick_shade IS 'Assigned lipstick shade for performances';
COMMENT ON COLUMN public.gw_profiles.pearl_status IS 'Pearl assignment status (unassigned, assigned, lost, replaced)';

-- Create a function to sync data between gw_profiles and gw_member_wardrobe_profiles
CREATE OR REPLACE FUNCTION public.sync_wardrobe_profile_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When gw_profiles is updated, sync to gw_member_wardrobe_profiles
  INSERT INTO public.gw_member_wardrobe_profiles (
    user_id,
    formal_dress_size,
    polo_size,
    tshirt_size,
    lipstick_shade,
    pearl_status,
    bust_measurement,
    waist_measurement,
    hips_measurement,
    inseam_measurement,
    height_measurement,
    measurements_taken_date,
    measurements_taken_by
  ) VALUES (
    NEW.user_id,
    NEW.formal_dress_size,
    NEW.polo_size,
    NEW.tshirt_size,
    NEW.lipstick_shade,
    NEW.pearl_status,
    NEW.bust_measurement,
    NEW.waist_measurement,
    NEW.hips_measurement,
    NEW.inseam_measurement,
    NEW.height_measurement,
    NEW.measurements_taken_date,
    NEW.measurements_taken_by
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    formal_dress_size = EXCLUDED.formal_dress_size,
    polo_size = EXCLUDED.polo_size,
    tshirt_size = EXCLUDED.tshirt_size,
    lipstick_shade = EXCLUDED.lipstick_shade,
    pearl_status = EXCLUDED.pearl_status,
    bust_measurement = EXCLUDED.bust_measurement,
    waist_measurement = EXCLUDED.waist_measurement,
    hips_measurement = EXCLUDED.hips_measurement,
    inseam_measurement = EXCLUDED.inseam_measurement,
    height_measurement = EXCLUDED.height_measurement,
    measurements_taken_date = EXCLUDED.measurements_taken_date,
    measurements_taken_by = EXCLUDED.measurements_taken_by,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Create trigger to sync data on profile updates
DROP TRIGGER IF EXISTS sync_wardrobe_data_trigger ON public.gw_profiles;
CREATE TRIGGER sync_wardrobe_data_trigger
  AFTER INSERT OR UPDATE ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_wardrobe_profile_data();

-- Create reverse sync function for wardrobe updates
CREATE OR REPLACE FUNCTION public.sync_profile_from_wardrobe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When gw_member_wardrobe_profiles is updated, sync to gw_profiles
  UPDATE public.gw_profiles SET
    formal_dress_size = NEW.formal_dress_size,
    polo_size = NEW.polo_size,
    tshirt_size = NEW.tshirt_size,
    lipstick_shade = NEW.lipstick_shade,
    pearl_status = NEW.pearl_status,
    bust_measurement = NEW.bust_measurement,
    waist_measurement = NEW.waist_measurement,
    hips_measurement = NEW.hips_measurement,
    inseam_measurement = NEW.inseam_measurement,
    height_measurement = NEW.height_measurement,
    measurements_taken_date = NEW.measurements_taken_date,
    measurements_taken_by = NEW.measurements_taken_by,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- Create trigger to sync data from wardrobe back to profiles
DROP TRIGGER IF EXISTS sync_profile_from_wardrobe_trigger ON public.gw_member_wardrobe_profiles;
CREATE TRIGGER sync_profile_from_wardrobe_trigger
  AFTER INSERT OR UPDATE ON public.gw_member_wardrobe_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_from_wardrobe();

-- Initial data sync - copy existing data from wardrobe profiles to main profiles
UPDATE public.gw_profiles SET
  formal_dress_size = mwp.formal_dress_size,
  polo_size = mwp.polo_size,
  tshirt_size = mwp.tshirt_size,
  lipstick_shade = mwp.lipstick_shade,
  pearl_status = mwp.pearl_status,
  bust_measurement = COALESCE(gw_profiles.bust_measurement, mwp.bust_measurement),
  waist_measurement = COALESCE(gw_profiles.waist_measurement, mwp.waist_measurement),
  hips_measurement = COALESCE(gw_profiles.hips_measurement, mwp.hips_measurement),
  inseam_measurement = COALESCE(gw_profiles.inseam_measurement, mwp.inseam_measurement),
  height_measurement = COALESCE(gw_profiles.height_measurement, mwp.height_measurement),
  measurements_taken_date = COALESCE(gw_profiles.measurements_taken_date, mwp.measurements_taken_date),
  measurements_taken_by = COALESCE(gw_profiles.measurements_taken_by, mwp.measurements_taken_by)
FROM public.gw_member_wardrobe_profiles mwp
WHERE gw_profiles.user_id = mwp.user_id;
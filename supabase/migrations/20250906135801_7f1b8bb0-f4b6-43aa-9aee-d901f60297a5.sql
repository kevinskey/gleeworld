-- Fix measurement synchronization between gw_profiles and gw_member_wardrobe_profiles
-- The tables have different column structures for measurements

-- Drop existing problematic triggers and functions
DROP TRIGGER IF EXISTS sync_to_wardrobe_profiles_trigger ON public.gw_profiles;
DROP TRIGGER IF EXISTS sync_to_gw_profiles_trigger ON public.gw_member_wardrobe_profiles;
DROP FUNCTION IF EXISTS public.sync_to_wardrobe_profiles();
DROP FUNCTION IF EXISTS public.sync_to_gw_profiles();

-- Create improved sync function from gw_profiles to gw_member_wardrobe_profiles
-- Maps JSONB measurements to individual columns
CREATE OR REPLACE FUNCTION public.sync_to_wardrobe_profiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if this is not already a sync operation
  IF TG_OP = 'UPDATE' AND OLD IS NOT DISTINCT FROM NEW THEN
    RETURN NEW;
  END IF;
  
  -- Insert or update wardrobe profile, extracting measurements from JSONB
  INSERT INTO public.gw_member_wardrobe_profiles (
    user_id, 
    bust_measurement,
    waist_measurement, 
    hips_measurement,
    height_measurement,
    formal_dress_size, 
    polo_size, 
    tshirt_size, 
    lipstick_shade, 
    pearl_status, 
    updated_at
  ) VALUES (
    NEW.user_id,
    (NEW.measurements->>'bust')::numeric,
    (NEW.measurements->>'waist')::numeric,
    (NEW.measurements->>'hips')::numeric,
    (NEW.measurements->>'height_cm')::numeric,
    NEW.formal_dress_size,
    NEW.polo_size,
    NEW.tshirt_size,
    NEW.lipstick_shade,
    NEW.pearl_status,
    NEW.updated_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    bust_measurement = (NEW.measurements->>'bust')::numeric,
    waist_measurement = (NEW.measurements->>'waist')::numeric,
    hips_measurement = (NEW.measurements->>'hips')::numeric,
    height_measurement = (NEW.measurements->>'height_cm')::numeric,
    formal_dress_size = EXCLUDED.formal_dress_size,
    polo_size = EXCLUDED.polo_size,
    tshirt_size = EXCLUDED.tshirt_size,
    lipstick_shade = EXCLUDED.lipstick_shade,
    pearl_status = EXCLUDED.pearl_status,
    updated_at = EXCLUDED.updated_at
  WHERE 
    -- Only update if values are actually different to prevent recursion
    (gw_member_wardrobe_profiles.bust_measurement IS DISTINCT FROM (NEW.measurements->>'bust')::numeric OR
     gw_member_wardrobe_profiles.waist_measurement IS DISTINCT FROM (NEW.measurements->>'waist')::numeric OR
     gw_member_wardrobe_profiles.hips_measurement IS DISTINCT FROM (NEW.measurements->>'hips')::numeric OR
     gw_member_wardrobe_profiles.height_measurement IS DISTINCT FROM (NEW.measurements->>'height_cm')::numeric OR
     gw_member_wardrobe_profiles.formal_dress_size IS DISTINCT FROM EXCLUDED.formal_dress_size OR
     gw_member_wardrobe_profiles.polo_size IS DISTINCT FROM EXCLUDED.polo_size OR
     gw_member_wardrobe_profiles.tshirt_size IS DISTINCT FROM EXCLUDED.tshirt_size OR
     gw_member_wardrobe_profiles.lipstick_shade IS DISTINCT FROM EXCLUDED.lipstick_shade OR
     gw_member_wardrobe_profiles.pearl_status IS DISTINCT FROM EXCLUDED.pearl_status);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create sync function from gw_member_wardrobe_profiles to gw_profiles
-- Maps individual columns to JSONB measurements
CREATE OR REPLACE FUNCTION public.sync_to_gw_profiles()
RETURNS TRIGGER AS $$
DECLARE
  new_measurements jsonb;
BEGIN
  -- Only proceed if this is not already a sync operation
  IF TG_OP = 'UPDATE' AND OLD IS NOT DISTINCT FROM NEW THEN
    RETURN NEW;
  END IF;
  
  -- Build measurements JSONB from individual columns
  new_measurements := jsonb_build_object(
    'bust', NEW.bust_measurement,
    'waist', NEW.waist_measurement,
    'hips', NEW.hips_measurement,
    'height_cm', NEW.height_measurement,
    'shoe_size', NULL
  );
  
  -- Update the corresponding gw_profiles record
  UPDATE public.gw_profiles SET
    measurements = new_measurements,
    formal_dress_size = NEW.formal_dress_size,
    polo_size = NEW.polo_size,
    tshirt_size = NEW.tshirt_size,
    lipstick_shade = NEW.lipstick_shade,
    pearl_status = NEW.pearl_status,
    updated_at = NEW.updated_at
  WHERE user_id = NEW.user_id
  AND (
    -- Only update if values are actually different to prevent recursion
    measurements IS DISTINCT FROM new_measurements OR
    formal_dress_size IS DISTINCT FROM NEW.formal_dress_size OR
    polo_size IS DISTINCT FROM NEW.polo_size OR
    tshirt_size IS DISTINCT FROM NEW.tshirt_size OR
    lipstick_shade IS DISTINCT FROM NEW.lipstick_shade OR
    pearl_status IS DISTINCT FROM NEW.pearl_status
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Recreate the triggers with the improved functions
CREATE TRIGGER sync_to_wardrobe_profiles_trigger
  AFTER INSERT OR UPDATE ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_to_wardrobe_profiles();

CREATE TRIGGER sync_to_gw_profiles_trigger
  AFTER INSERT OR UPDATE ON public.gw_member_wardrobe_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_to_gw_profiles();
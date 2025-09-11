-- Fix the recursion issue by removing duplicate wardrobe sync triggers
-- and consolidating the logic into a single, safer trigger

-- Drop the duplicate trigger that's causing issues
DROP TRIGGER IF EXISTS sync_wardrobe_data_trigger ON public.gw_profiles;
DROP FUNCTION IF EXISTS sync_wardrobe_profile_data();

-- Improve the remaining sync function to be more robust
CREATE OR REPLACE FUNCTION public.sync_gw_profiles_to_wardrobe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bust_val numeric;
  waist_val numeric;
  hips_val numeric;
  height_cm_val numeric;
BEGIN
  -- Re-entrancy guard: if already syncing, exit
  IF current_setting('app.sync_in_progress', true) = '1' THEN
    RETURN NEW;
  END IF;

  -- Only proceed if wardrobe-related fields actually changed
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.measurements IS NOT DISTINCT FROM NEW.measurements AND
        OLD.formal_dress_size IS NOT DISTINCT FROM NEW.formal_dress_size AND
        OLD.polo_size IS NOT DISTINCT FROM NEW.polo_size AND
        OLD.tshirt_size IS NOT DISTINCT FROM NEW.tshirt_size AND
        OLD.lipstick_shade IS NOT DISTINCT FROM NEW.lipstick_shade AND
        OLD.pearl_status IS NOT DISTINCT FROM NEW.pearl_status AND
        OLD.bust_measurement IS NOT DISTINCT FROM NEW.bust_measurement AND
        OLD.waist_measurement IS NOT DISTINCT FROM NEW.waist_measurement AND
        OLD.hips_measurement IS NOT DISTINCT FROM NEW.hips_measurement AND
        OLD.inseam_measurement IS NOT DISTINCT FROM NEW.inseam_measurement AND
        OLD.height_measurement IS NOT DISTINCT FROM NEW.height_measurement AND
        OLD.measurements_taken_date IS NOT DISTINCT FROM NEW.measurements_taken_date AND
        OLD.measurements_taken_by IS NOT DISTINCT FROM NEW.measurements_taken_by) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Parse numeric values safely from JSONB
  IF NEW.measurements ? 'bust' THEN
    IF (NEW.measurements->>'bust') ~ '^[0-9]+(\.[0-9]+)?$' THEN
      bust_val := (NEW.measurements->>'bust')::numeric;
    ELSE
      bust_val := NEW.bust_measurement;
    END IF;
  ELSE
    bust_val := NEW.bust_measurement;
  END IF;

  IF NEW.measurements ? 'waist' THEN
    IF (NEW.measurements->>'waist') ~ '^[0-9]+(\.[0-9]+)?$' THEN
      waist_val := (NEW.measurements->>'waist')::numeric;
    ELSE
      waist_val := NEW.waist_measurement;
    END IF;
  ELSE
    waist_val := NEW.waist_measurement;
  END IF;

  IF NEW.measurements ? 'hips' THEN
    IF (NEW.measurements->>'hips') ~ '^[0-9]+(\.[0-9]+)?$' THEN
      hips_val := (NEW.measurements->>'hips')::numeric;
    ELSE
      hips_val := NEW.hips_measurement;
    END IF;
  ELSE
    hips_val := NEW.hips_measurement;
  END IF;

  IF NEW.measurements ? 'height_cm' THEN
    IF (NEW.measurements->>'height_cm') ~ '^[0-9]+(\.[0-9]+)?$' THEN
      height_cm_val := (NEW.measurements->>'height_cm')::numeric;
    ELSE
      height_cm_val := NEW.height_measurement;
    END IF;
  ELSE
    height_cm_val := NEW.height_measurement;
  END IF;

  PERFORM set_config('app.sync_in_progress', '1', true);

  BEGIN
    -- Upsert wardrobe profile with all fields
    INSERT INTO public.gw_member_wardrobe_profiles (
      user_id,
      bust_measurement,
      waist_measurement,
      hips_measurement,
      inseam_measurement,
      height_measurement,
      formal_dress_size,
      polo_size,
      tshirt_size,
      lipstick_shade,
      pearl_status,
      measurements_taken_date,
      measurements_taken_by
    )
    VALUES (
      NEW.user_id,
      bust_val,
      waist_val,
      hips_val,
      NEW.inseam_measurement,
      height_cm_val,
      NEW.formal_dress_size,
      NEW.polo_size,
      NEW.tshirt_size,
      NEW.lipstick_shade,
      NEW.pearl_status,
      NEW.measurements_taken_date,
      NEW.measurements_taken_by
    )
    ON CONFLICT (user_id) DO UPDATE
      SET bust_measurement   = EXCLUDED.bust_measurement,
          waist_measurement  = EXCLUDED.waist_measurement,
          hips_measurement   = EXCLUDED.hips_measurement,
          inseam_measurement = EXCLUDED.inseam_measurement,
          height_measurement = EXCLUDED.height_measurement,
          formal_dress_size  = EXCLUDED.formal_dress_size,
          polo_size          = EXCLUDED.polo_size,
          tshirt_size        = EXCLUDED.tshirt_size,
          lipstick_shade     = EXCLUDED.lipstick_shade,
          pearl_status       = EXCLUDED.pearl_status,
          measurements_taken_date = EXCLUDED.measurements_taken_date,
          measurements_taken_by = EXCLUDED.measurements_taken_by,
          updated_at = now()
    WHERE
      gw_member_wardrobe_profiles.bust_measurement   IS DISTINCT FROM EXCLUDED.bust_measurement OR
      gw_member_wardrobe_profiles.waist_measurement  IS DISTINCT FROM EXCLUDED.waist_measurement OR
      gw_member_wardrobe_profiles.hips_measurement   IS DISTINCT FROM EXCLUDED.hips_measurement OR
      gw_member_wardrobe_profiles.inseam_measurement IS DISTINCT FROM EXCLUDED.inseam_measurement OR
      gw_member_wardrobe_profiles.height_measurement IS DISTINCT FROM EXCLUDED.height_measurement OR
      gw_member_wardrobe_profiles.formal_dress_size  IS DISTINCT FROM EXCLUDED.formal_dress_size OR
      gw_member_wardrobe_profiles.polo_size          IS DISTINCT FROM EXCLUDED.polo_size OR
      gw_member_wardrobe_profiles.tshirt_size        IS DISTINCT FROM EXCLUDED.tshirt_size OR
      gw_member_wardrobe_profiles.lipstick_shade     IS DISTINCT FROM EXCLUDED.lipstick_shade OR
      gw_member_wardrobe_profiles.pearl_status       IS DISTINCT FROM EXCLUDED.pearl_status OR
      gw_member_wardrobe_profiles.measurements_taken_date IS DISTINCT FROM EXCLUDED.measurements_taken_date OR
      gw_member_wardrobe_profiles.measurements_taken_by IS DISTINCT FROM EXCLUDED.measurements_taken_by;

  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.sync_in_progress', '0', true);
    RAISE;
  END;

  PERFORM set_config('app.sync_in_progress', '0', true);
  RETURN NEW;
END;
$$;
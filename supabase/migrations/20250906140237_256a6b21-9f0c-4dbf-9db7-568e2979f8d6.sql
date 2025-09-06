
-- 1) Drop existing triggers and functions (idempotent)
DROP TRIGGER IF EXISTS sync_to_wardrobe_profiles_trigger ON public.gw_profiles;
DROP TRIGGER IF EXISTS sync_to_gw_profiles_trigger ON public.gw_member_wardrobe_profiles;

DROP FUNCTION IF EXISTS public.sync_to_wardrobe_profiles();
DROP FUNCTION IF EXISTS public.sync_to_gw_profiles();

-- 2) Create: gw_profiles -> gw_member_wardrobe_profiles
-- Maps JSONB measurements to individual columns, with a recursion guard
CREATE OR REPLACE FUNCTION public.sync_gw_profiles_to_wardrobe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
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

  -- Parse numeric values safely from JSONB
  IF NEW.measurements ? 'bust' THEN
    IF (NEW.measurements->>'bust') ~ '^[0-9]+(\.[0-9]+)?$' THEN
      bust_val := (NEW.measurements->>'bust')::numeric;
    ELSE
      bust_val := NULL;
    END IF;
  END IF;

  IF NEW.measurements ? 'waist' THEN
    IF (NEW.measurements->>'waist') ~ '^[0-9]+(\.[0-9]+)?$' THEN
      waist_val := (NEW.measurements->>'waist')::numeric;
    ELSE
      waist_val := NULL;
    END IF;
  END IF;

  IF NEW.measurements ? 'hips' THEN
    IF (NEW.measurements->>'hips') ~ '^[0-9]+(\.[0-9]+)?$' THEN
      hips_val := (NEW.measurements->>'hips')::numeric;
    ELSE
      hips_val := NULL;
    END IF;
  END IF;

  IF NEW.measurements ? 'height_cm' THEN
    IF (NEW.measurements->>'height_cm') ~ '^[0-9]+(\.[0-9]+)?$' THEN
      height_cm_val := (NEW.measurements->>'height_cm')::numeric;
    ELSE
      height_cm_val := NULL;
    END IF;
  END IF;

  PERFORM set_config('app.sync_in_progress', '1', true);

  BEGIN
    -- Upsert wardrobe profile with mapped values
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
      pearl_status
    )
    VALUES (
      NEW.user_id,
      bust_val,
      waist_val,
      hips_val,
      height_cm_val,
      NEW.formal_dress_size,
      NEW.polo_size,
      NEW.tshirt_size,
      NEW.lipstick_shade,
      NEW.pearl_status
    )
    ON CONFLICT (user_id) DO UPDATE
      SET bust_measurement   = EXCLUDED.bust_measurement,
          waist_measurement  = EXCLUDED.waist_measurement,
          hips_measurement   = EXCLUDED.hips_measurement,
          height_measurement = EXCLUDED.height_measurement,
          formal_dress_size  = EXCLUDED.formal_dress_size,
          polo_size          = EXCLUDED.polo_size,
          tshirt_size        = EXCLUDED.tshirt_size,
          lipstick_shade     = EXCLUDED.lipstick_shade,
          pearl_status       = EXCLUDED.pearl_status
    WHERE
      gw_member_wardrobe_profiles.bust_measurement   IS DISTINCT FROM EXCLUDED.bust_measurement OR
      gw_member_wardrobe_profiles.waist_measurement  IS DISTINCT FROM EXCLUDED.waist_measurement OR
      gw_member_wardrobe_profiles.hips_measurement   IS DISTINCT FROM EXCLUDED.hips_measurement OR
      gw_member_wardrobe_profiles.height_measurement IS DISTINCT FROM EXCLUDED.height_measurement OR
      gw_member_wardrobe_profiles.formal_dress_size  IS DISTINCT FROM EXCLUDED.formal_dress_size OR
      gw_member_wardrobe_profiles.polo_size          IS DISTINCT FROM EXCLUDED.polo_size OR
      gw_member_wardrobe_profiles.tshirt_size        IS DISTINCT FROM EXCLUDED.tshirt_size OR
      gw_member_wardrobe_profiles.lipstick_shade     IS DISTINCT FROM EXCLUDED.lipstick_shade OR
      gw_member_wardrobe_profiles.pearl_status       IS DISTINCT FROM EXCLUDED.pearl_status;

  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.sync_in_progress', '0', true);
    RAISE;
  END;

  PERFORM set_config('app.sync_in_progress', '0', true);
  RETURN NEW;
END;
$$;

-- 3) Create: gw_member_wardrobe_profiles -> gw_profiles
-- Maps individual columns back to JSONB measurements, with a recursion guard
CREATE OR REPLACE FUNCTION public.sync_wardrobe_to_gw_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  new_measurements jsonb;
BEGIN
  -- Re-entrancy guard: if already syncing, exit
  IF current_setting('app.sync_in_progress', true) = '1' THEN
    RETURN NEW;
  END IF;

  -- Build JSONB measurements from columns
  new_measurements := jsonb_strip_nulls(jsonb_build_object(
    'bust',      NEW.bust_measurement,
    'waist',     NEW.waist_measurement,
    'hips',      NEW.hips_measurement,
    'height_cm', NEW.height_measurement
  ));

  PERFORM set_config('app.sync_in_progress', '1', true);

  BEGIN
    -- Update gw_profiles only if there are real differences
    UPDATE public.gw_profiles
      SET measurements     = new_measurements,
          formal_dress_size = NEW.formal_dress_size,
          polo_size         = NEW.polo_size,
          tshirt_size       = NEW.tshirt_size,
          lipstick_shade    = NEW.lipstick_shade,
          pearl_status      = NEW.pearl_status
    WHERE user_id = NEW.user_id
      AND (
        measurements     IS DISTINCT FROM new_measurements OR
        formal_dress_size IS DISTINCT FROM NEW.formal_dress_size OR
        polo_size         IS DISTINCT FROM NEW.polo_size OR
        tshirt_size       IS DISTINCT FROM NEW.tshirt_size OR
        lipstick_shade    IS DISTINCT FROM NEW.lipstick_shade OR
        pearl_status      IS DISTINCT FROM NEW.pearl_status
      );

  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.sync_in_progress', '0', true);
    RAISE;
  END;

  PERFORM set_config('app.sync_in_progress', '0', true);
  RETURN NEW;
END;
$$;

-- 4) Recreate the triggers (AFTER triggers; limit to relevant columns to reduce noise)
CREATE TRIGGER sync_to_wardrobe_profiles_trigger
  AFTER INSERT OR UPDATE OF measurements, formal_dress_size, polo_size, tshirt_size, lipstick_shade, pearl_status
  ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gw_profiles_to_wardrobe();

CREATE TRIGGER sync_to_gw_profiles_trigger
  AFTER INSERT OR UPDATE OF bust_measurement, waist_measurement, hips_measurement, height_measurement, formal_dress_size, polo_size, tshirt_size, lipstick_shade, pearl_status
  ON public.gw_member_wardrobe_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_wardrobe_to_gw_profiles();

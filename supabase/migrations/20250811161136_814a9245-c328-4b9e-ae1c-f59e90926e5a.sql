-- Create a normalization trigger to prevent CHECK constraint violations on sight_reading_level
-- and voice_part_preference before insertion/update

-- 1) Create or replace function
CREATE OR REPLACE FUNCTION public.normalize_audition_application_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Normalize sight_reading_level: allow only 'beginner','intermediate','advanced'; else NULL
  IF NEW.sight_reading_level IS NOT NULL THEN
    NEW.sight_reading_level := lower(trim(NEW.sight_reading_level));
    IF NEW.sight_reading_level NOT IN ('beginner','intermediate','advanced') THEN
      NEW.sight_reading_level := NULL;
    END IF;
  END IF;

  -- Normalize voice_part_preference to the strict codes S1,S2,A1,A2,T1,T2,B1,B2; else NULL
  IF NEW.voice_part_preference IS NOT NULL THEN
    NEW.voice_part_preference := upper(trim(NEW.voice_part_preference));
    IF NEW.voice_part_preference NOT IN ('S1','S2','A1','A2','T1','T2','B1','B2') THEN
      -- Try simple mappings from common names
      CASE
        WHEN NEW.voice_part_preference LIKE 'SOPRANO%' THEN NEW.voice_part_preference := 'S1';
        WHEN NEW.voice_part_preference LIKE 'ALTO%' THEN NEW.voice_part_preference := 'A1';
        WHEN NEW.voice_part_preference LIKE 'TENOR%' THEN NEW.voice_part_preference := 'T1';
        WHEN NEW.voice_part_preference LIKE 'BASS%' THEN NEW.voice_part_preference := 'B1';
        ELSE NEW.voice_part_preference := NULL;
      END CASE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Create trigger (idempotent)
DROP TRIGGER IF EXISTS normalize_audition_application_fields_trigger ON public.audition_applications;
CREATE TRIGGER normalize_audition_application_fields_trigger
BEFORE INSERT OR UPDATE ON public.audition_applications
FOR EACH ROW
EXECUTE FUNCTION public.normalize_audition_application_fields();
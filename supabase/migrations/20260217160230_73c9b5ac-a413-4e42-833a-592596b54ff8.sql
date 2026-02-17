
-- Fix: Exclude MUS 070 / Glee Club entries from self-conflict detection
CREATE OR REPLACE FUNCTION check_rehearsal_conflict()
RETURNS TRIGGER AS $$
DECLARE
  rehearsal_start TIME := '17:00:00';
  rehearsal_end TIME := '18:15:00';
  rehearsal_days TEXT[] := ARRAY['Monday', 'Wednesday', 'Friday'];
  overlapping_days TEXT[];
BEGIN
  -- Skip conflict check if this IS the Glee Club course itself
  IF LOWER(TRIM(NEW.course_name)) IN ('glee club', 'mus 070', 'mus070')
     OR UPPER(TRIM(COALESCE(NEW.course_code, ''))) IN ('MUS 070', 'MUS070', '070') THEN
    NEW.has_conflict := false;
    NEW.conflict_details := NULL;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Find days that overlap with rehearsal schedule
  SELECT ARRAY_AGG(d) INTO overlapping_days
  FROM unnest(NEW.days) AS d
  WHERE d = ANY(rehearsal_days);
  
  -- Check if there's a time overlap on rehearsal days
  IF overlapping_days IS NOT NULL AND array_length(overlapping_days, 1) > 0 THEN
    IF NEW.end_time > rehearsal_start AND NEW.start_time < rehearsal_end THEN
      NEW.has_conflict := true;
      NEW.conflict_details := format(
        'Conflicts with Glee Club rehearsal (5:00-6:15 PM) on %s from %s to %s',
        array_to_string(overlapping_days, ', '),
        NEW.start_time::TEXT,
        NEW.end_time::TEXT
      );
    ELSE
      NEW.has_conflict := false;
      NEW.conflict_details := NULL;
    END IF;
  ELSE
    NEW.has_conflict := false;
    NEW.conflict_details := NULL;
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recalculate all conflicts with the updated trigger
-- Touch all rows to re-trigger the conflict check
UPDATE student_class_schedules SET updated_at = now();

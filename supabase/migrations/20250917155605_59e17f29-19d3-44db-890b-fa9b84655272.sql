-- Fix the trigger function to not reference non-existent updated_at column in mus240_poll_responses

CREATE OR REPLACE FUNCTION public.award_poll_participation_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  current_semester TEXT;
  points_to_award NUMERIC := 1.0; -- 1 point per poll participation
  student_uuid uuid;
BEGIN
  -- Only award credit for authenticated users where student_id is a valid UUID
  IF NEW.student_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    student_uuid := NEW.student_id::uuid;
  ELSE
    -- Anonymous/string identifiers are stored but should not affect graded participation
    RETURN NEW;
  END IF;

  -- Derive current semester token
  current_semester := CASE 
    WHEN EXTRACT(MONTH FROM NOW()) BETWEEN 1 AND 5 THEN EXTRACT(YEAR FROM NOW())::TEXT || '_SPRING'
    WHEN EXTRACT(MONTH FROM NOW()) BETWEEN 6 AND 8 THEN EXTRACT(YEAR FROM NOW())::TEXT || '_SUMMER'
    ELSE EXTRACT(YEAR FROM NOW())::TEXT || '_FALL'
  END;

  -- Upsert participation points; rely on defaults for points_possible and timestamps
  INSERT INTO public.mus240_participation_grades (
    student_id,
    semester,
    points_earned
  ) VALUES (
    student_uuid,
    current_semester,
    points_to_award
  )
  ON CONFLICT (student_id, semester)
  DO UPDATE SET 
    points_earned = public.mus240_participation_grades.points_earned + points_to_award,
    updated_at = now();

  RETURN NEW;
END;
$$;
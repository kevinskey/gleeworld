-- Fix poll participation trigger and stats function to align with current schema and text student_id in mus240_poll_responses

-- 1) Update trigger function to use points_possible (not total_possible) and handle text student_id safely
CREATE OR REPLACE FUNCTION public.award_poll_participation_points()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- 2) Update participation stats function to work with text student_id and avoid UUID cast errors
CREATE OR REPLACE FUNCTION public.get_poll_participation_stats(poll_id_param UUID)
RETURNS TABLE(
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  response_count BIGINT,
  points_awarded NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.student_id::uuid AS student_id,
    gp.full_name AS student_name,
    gp.email AS student_email,
    COUNT(pr.id) AS response_count,
    COUNT(pr.id)::NUMERIC AS points_awarded
  FROM public.mus240_poll_responses pr
  JOIN public.gw_profiles gp ON gp.user_id = pr.student_id::uuid
  WHERE pr.poll_id = poll_id_param
    AND pr.student_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  GROUP BY pr.student_id, gp.full_name, gp.email
  ORDER BY gp.full_name;
END;
$$;
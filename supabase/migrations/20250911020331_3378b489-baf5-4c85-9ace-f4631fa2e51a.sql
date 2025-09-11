-- Create function to award participation points for poll responses
CREATE OR REPLACE FUNCTION award_poll_participation_points()
RETURNS TRIGGER AS $$
DECLARE
  student_profile RECORD;
  current_semester TEXT;
  points_to_award NUMERIC := 1.0; -- 1 point per poll participation
BEGIN
  -- Get current semester
  current_semester := CASE 
    WHEN EXTRACT(MONTH FROM NOW()) BETWEEN 1 AND 5 THEN 
      EXTRACT(YEAR FROM NOW())::TEXT || '_SPRING'
    WHEN EXTRACT(MONTH FROM NOW()) BETWEEN 6 AND 8 THEN 
      EXTRACT(YEAR FROM NOW())::TEXT || '_SUMMER'
    ELSE 
      EXTRACT(YEAR FROM NOW())::TEXT || '_FALL'
  END;

  -- Check if student already has a participation record for this semester
  INSERT INTO public.mus240_participation_grades (
    student_id,
    semester,
    points_earned,
    total_possible,
    last_updated
  ) VALUES (
    NEW.student_id,
    current_semester,
    points_to_award,
    100, -- Assuming 100 total possible points for the semester
    NOW()
  )
  ON CONFLICT (student_id, semester) 
  DO UPDATE SET 
    points_earned = mus240_participation_grades.points_earned + points_to_award,
    last_updated = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to award points when students respond to polls
CREATE TRIGGER award_poll_participation_trigger
  AFTER INSERT ON public.mus240_poll_responses
  FOR EACH ROW
  EXECUTE FUNCTION award_poll_participation_points();

-- Create a function to view participation stats
CREATE OR REPLACE FUNCTION get_poll_participation_stats(poll_id_param UUID)
RETURNS TABLE(
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  response_count BIGINT,
  points_awarded NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.student_id,
    gp.full_name as student_name,
    gp.email as student_email,
    COUNT(pr.id) as response_count,
    COUNT(pr.id)::NUMERIC as points_awarded
  FROM public.mus240_poll_responses pr
  JOIN public.gw_profiles gp ON gp.user_id = pr.student_id
  WHERE pr.poll_id = poll_id_param
  GROUP BY pr.student_id, gp.full_name, gp.email
  ORDER BY gp.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create participation grades table for MUS 240
CREATE TABLE public.mus240_participation_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  semester TEXT NOT NULL DEFAULT 'Fall 2024',
  points_earned NUMERIC(5,2) NOT NULL DEFAULT 0,
  points_possible NUMERIC(5,2) NOT NULL DEFAULT 75,
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, semester)
);

-- Create grade summaries table for MUS 240
CREATE TABLE public.mus240_grade_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  semester TEXT NOT NULL DEFAULT 'Fall 2024',
  assignment_points NUMERIC(7,2) NOT NULL DEFAULT 0,
  assignment_possible NUMERIC(7,2) NOT NULL DEFAULT 650,
  participation_points NUMERIC(5,2) NOT NULL DEFAULT 0,
  participation_possible NUMERIC(5,2) NOT NULL DEFAULT 75,
  overall_points NUMERIC(7,2) NOT NULL DEFAULT 0,
  overall_possible NUMERIC(7,2) NOT NULL DEFAULT 725,
  overall_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  letter_grade TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, semester)
);

-- Enable RLS
ALTER TABLE public.mus240_participation_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_grade_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for participation grades
CREATE POLICY "Students can view their own participation grades"
ON public.mus240_participation_grades
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all participation grades"
ON public.mus240_participation_grades
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- RLS Policies for grade summaries
CREATE POLICY "Students can view their own grade summaries"
ON public.mus240_grade_summaries
FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all grade summaries"
ON public.mus240_grade_summaries
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Create function to calculate and update grade summary
CREATE OR REPLACE FUNCTION public.calculate_mus240_grade_summary(
  student_id_param UUID,
  semester_param TEXT DEFAULT 'Fall 2024'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assignment_total NUMERIC(7,2) := 0;
  participation_total NUMERIC(5,2) := 0;
  overall_total NUMERIC(7,2);
  overall_percentage NUMERIC(5,2);
  grade_letter TEXT;
  result jsonb;
BEGIN
  -- Calculate assignment points from submissions
  SELECT COALESCE(SUM(COALESCE(grade, 0)), 0) 
  INTO assignment_total
  FROM public.assignment_submissions
  WHERE student_id = student_id_param;
  
  -- Get participation points
  SELECT COALESCE(points_earned, 0)
  INTO participation_total
  FROM public.mus240_participation_grades
  WHERE student_id = student_id_param AND semester = semester_param;
  
  -- Calculate totals
  overall_total := assignment_total + participation_total;
  overall_percentage := ROUND((overall_total / 725.0) * 100, 2);
  
  -- Determine letter grade
  IF overall_percentage >= 97 THEN grade_letter := 'A+';
  ELSIF overall_percentage >= 93 THEN grade_letter := 'A';
  ELSIF overall_percentage >= 90 THEN grade_letter := 'A-';
  ELSIF overall_percentage >= 87 THEN grade_letter := 'B+';
  ELSIF overall_percentage >= 83 THEN grade_letter := 'B';
  ELSIF overall_percentage >= 80 THEN grade_letter := 'B-';
  ELSIF overall_percentage >= 77 THEN grade_letter := 'C+';
  ELSIF overall_percentage >= 73 THEN grade_letter := 'C';
  ELSIF overall_percentage >= 70 THEN grade_letter := 'C-';
  ELSIF overall_percentage >= 67 THEN grade_letter := 'D+';
  ELSIF overall_percentage >= 63 THEN grade_letter := 'D';
  ELSIF overall_percentage >= 60 THEN grade_letter := 'D-';
  ELSE grade_letter := 'F';
  END IF;
  
  -- Upsert grade summary
  INSERT INTO public.mus240_grade_summaries (
    student_id, semester, assignment_points, assignment_possible,
    participation_points, participation_possible, overall_points,
    overall_possible, overall_percentage, letter_grade
  ) VALUES (
    student_id_param, semester_param, assignment_total, 650,
    participation_total, 75, overall_total, 725, overall_percentage, grade_letter
  )
  ON CONFLICT (student_id, semester)
  DO UPDATE SET
    assignment_points = EXCLUDED.assignment_points,
    participation_points = EXCLUDED.participation_points,
    overall_points = EXCLUDED.overall_points,
    overall_percentage = EXCLUDED.overall_percentage,
    letter_grade = EXCLUDED.letter_grade,
    calculated_at = now();
  
  -- Return result
  result := jsonb_build_object(
    'assignment_points', assignment_total,
    'participation_points', participation_total,
    'overall_points', overall_total,
    'overall_percentage', overall_percentage,
    'letter_grade', grade_letter
  );
  
  RETURN result;
END;
$$;

-- Create triggers for automatic grade recalculation
CREATE OR REPLACE FUNCTION public.trigger_mus240_grade_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Recalculate grade for the affected student
  PERFORM public.calculate_mus240_grade_summary(
    COALESCE(NEW.student_id, OLD.student_id)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_assignment_submissions_grade_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_mus240_grade_recalc();

CREATE TRIGGER trigger_participation_grades_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.mus240_participation_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_mus240_grade_recalc();

-- Create updated_at triggers
CREATE TRIGGER update_mus240_participation_grades_updated_at
  BEFORE UPDATE ON public.mus240_participation_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mus240_grade_summaries_updated_at
  BEFORE UPDATE ON public.mus240_grade_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Create sight reading assignment system for members (fixed)

-- Assignment types and statuses
CREATE TYPE assignment_type AS ENUM ('sight_reading', 'practice_exercise', 'section_notes', 'pdf_resource', 'audio_resource');
CREATE TYPE assignment_status AS ENUM ('assigned', 'in_progress', 'submitted', 'graded', 'overdue');
CREATE TYPE grading_period AS ENUM ('week_1', 'week_2', 'week_3', 'week_4', 'week_5', 'week_6', 'week_7', 'week_8', 'week_9', 'week_10', 'week_11', 'week_12', 'week_13');

-- Sight Reading Assignments table
CREATE TABLE public.gw_sight_reading_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assignment_type assignment_type NOT NULL DEFAULT 'sight_reading',
  
  -- Assignment details
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  grading_period grading_period NOT NULL,
  points_possible INTEGER DEFAULT 100,
  
  -- Assignment content
  sheet_music_id UUID REFERENCES public.gw_sheet_music(id),
  pdf_url TEXT,
  audio_url TEXT,
  notes TEXT,
  
  -- Assignment targeting
  assigned_by UUID NOT NULL, -- Student conductor or section leader
  target_type TEXT NOT NULL DEFAULT 'individual', -- 'individual', 'section', 'class', 'all'
  target_value TEXT, -- user_id for individual, section name for section, etc.
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_target_type CHECK (target_type IN ('individual', 'section', 'class', 'all'))
);

-- Individual Assignment Records (connects assignments to specific users)
CREATE TABLE public.gw_assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.gw_sight_reading_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Submission details
  status assignment_status NOT NULL DEFAULT 'assigned',
  submitted_at TIMESTAMP WITH TIME ZONE,
  recording_url TEXT,
  recording_id UUID,
  notes TEXT,
  
  -- Grading
  score_value NUMERIC(5,2), -- Grade out of points_possible
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID,
  
  -- Performance metrics (from AI assessment)
  pitch_accuracy NUMERIC(5,2),
  rhythm_accuracy NUMERIC(5,2),
  overall_performance JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(assignment_id, user_id)
);

-- Semester Grading Tracking
CREATE TABLE public.gw_semester_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  semester_name TEXT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::TEXT || '_' || 
    CASE 
      WHEN EXTRACT(MONTH FROM NOW()) BETWEEN 1 AND 5 THEN 'SPRING'
      WHEN EXTRACT(MONTH FROM NOW()) BETWEEN 6 AND 8 THEN 'SUMMER'
      ELSE 'FALL'
    END,
  
  -- Weekly grades
  week_1_points NUMERIC(10,2) DEFAULT 0,
  week_2_points NUMERIC(10,2) DEFAULT 0,
  week_3_points NUMERIC(10,2) DEFAULT 0,
  week_4_points NUMERIC(10,2) DEFAULT 0,
  week_5_points NUMERIC(10,2) DEFAULT 0,
  week_6_points NUMERIC(10,2) DEFAULT 0,
  week_7_points NUMERIC(10,2) DEFAULT 0,
  week_8_points NUMERIC(10,2) DEFAULT 0,
  week_9_points NUMERIC(10,2) DEFAULT 0,
  week_10_points NUMERIC(10,2) DEFAULT 0,
  week_11_points NUMERIC(10,2) DEFAULT 0,
  week_12_points NUMERIC(10,2) DEFAULT 0,
  week_13_points NUMERIC(10,2) DEFAULT 0,
  
  total_points_possible NUMERIC(10,2) DEFAULT 0,
  total_points_earned NUMERIC(10,2) DEFAULT 0,
  current_grade NUMERIC(5,2), -- Percentage
  letter_grade TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, semester_name)
);

-- Enable RLS
ALTER TABLE public.gw_sight_reading_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_semester_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Assignments
CREATE POLICY "Student conductors can create assignments"
ON public.gw_sight_reading_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'student_conductor'
    AND is_active = true
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Student conductors can manage their assignments"
ON public.gw_sight_reading_assignments
FOR ALL
USING (
  assigned_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Members can view their relevant assignments"
ON public.gw_sight_reading_assignments
FOR SELECT
USING (
  is_active = true
  AND (
    -- Individual assignments
    (target_type = 'individual' AND target_value = auth.uid()::text)
    OR
    -- Section assignments (check user's section from profile)
    (target_type = 'section' AND EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND voice_part = target_value
    ))
    OR
    -- Class assignments (check user's academic year)
    (target_type = 'class' AND EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND academic_year = target_value
    ))
    OR
    -- All assignments
    target_type = 'all'
    OR
    -- Assignment creator or admin
    assigned_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  )
);

-- RLS Policies for Submissions
CREATE POLICY "Users can manage their own submissions"
ON public.gw_assignment_submissions
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Assignment creators can view and grade submissions"
ON public.gw_assignment_submissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_sight_reading_assignments 
    WHERE id = assignment_id 
    AND assigned_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- RLS Policies for Semester Grades
CREATE POLICY "Users can view their own grades"
ON public.gw_semester_grades
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Instructors can manage all grades"
ON public.gw_semester_grades
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'student_conductor'
    AND is_active = true
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_sight_reading_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sight_reading_assignments_updated_at
BEFORE UPDATE ON public.gw_sight_reading_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_sight_reading_assignments_updated_at();

CREATE OR REPLACE FUNCTION public.update_assignment_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assignment_submissions_updated_at
BEFORE UPDATE ON public.gw_assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_assignment_submissions_updated_at();

CREATE OR REPLACE FUNCTION public.update_semester_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_semester_grades_updated_at
BEFORE UPDATE ON public.gw_semester_grades
FOR EACH ROW
EXECUTE FUNCTION public.update_semester_grades_updated_at();

-- Function to calculate and update semester grades
CREATE OR REPLACE FUNCTION public.calculate_semester_grade(user_id_param UUID, semester_name_param TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  current_semester TEXT;
  total_earned NUMERIC(10,2) := 0;
  total_possible NUMERIC(10,2) := 0;
  grade_percentage NUMERIC(5,2);
  letter_grade TEXT;
BEGIN
  -- Default to current semester if not provided
  IF semester_name_param IS NULL THEN
    current_semester := EXTRACT(YEAR FROM NOW())::TEXT || '_' || 
      CASE 
        WHEN EXTRACT(MONTH FROM NOW()) BETWEEN 1 AND 5 THEN 'SPRING'
        WHEN EXTRACT(MONTH FROM NOW()) BETWEEN 6 AND 8 THEN 'SUMMER'
        ELSE 'FALL'
      END;
  ELSE
    current_semester := semester_name_param;
  END IF;
  
  -- Calculate totals from submissions
  SELECT 
    COALESCE(SUM(sub.score_value), 0),
    COALESCE(SUM(a.points_possible), 0)
  INTO total_earned, total_possible
  FROM public.gw_assignment_submissions sub
  JOIN public.gw_sight_reading_assignments a ON a.id = sub.assignment_id
  WHERE sub.user_id = user_id_param
  AND sub.status IN ('submitted', 'graded')
  AND a.created_at >= (
    CASE 
      WHEN current_semester LIKE '%_SPRING' THEN 
        (SUBSTRING(current_semester FROM 1 FOR 4)::INTEGER || '-01-01')::DATE
      WHEN current_semester LIKE '%_SUMMER' THEN 
        (SUBSTRING(current_semester FROM 1 FOR 4)::INTEGER || '-06-01')::DATE
      ELSE 
        (SUBSTRING(current_semester FROM 1 FOR 4)::INTEGER || '-08-01')::DATE
    END
  );
  
  -- Calculate percentage
  IF total_possible > 0 THEN
    grade_percentage := (total_earned / total_possible) * 100;
  ELSE
    grade_percentage := 0;
  END IF;
  
  -- Determine letter grade
  letter_grade := CASE 
    WHEN grade_percentage >= 97 THEN 'A+'
    WHEN grade_percentage >= 93 THEN 'A'
    WHEN grade_percentage >= 90 THEN 'A-'
    WHEN grade_percentage >= 87 THEN 'B+'
    WHEN grade_percentage >= 83 THEN 'B'
    WHEN grade_percentage >= 80 THEN 'B-'
    WHEN grade_percentage >= 77 THEN 'C+'
    WHEN grade_percentage >= 73 THEN 'C'
    WHEN grade_percentage >= 70 THEN 'C-'
    WHEN grade_percentage >= 67 THEN 'D+'
    WHEN grade_percentage >= 63 THEN 'D'
    WHEN grade_percentage >= 60 THEN 'D-'
    ELSE 'F'
  END;
  
  -- Insert or update semester grade record
  INSERT INTO public.gw_semester_grades (
    user_id, semester_name, total_points_earned, total_points_possible, 
    current_grade, letter_grade
  ) VALUES (
    user_id_param, current_semester, total_earned, total_possible,
    grade_percentage, letter_grade
  )
  ON CONFLICT (user_id, semester_name)
  DO UPDATE SET
    total_points_earned = EXCLUDED.total_points_earned,
    total_points_possible = EXCLUDED.total_points_possible,
    current_grade = EXCLUDED.current_grade,
    letter_grade = EXCLUDED.letter_grade,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create assignment notifications
CREATE OR REPLACE FUNCTION public.create_assignment_notifications()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  user_profile RECORD;
BEGIN
  -- Create notifications based on target type
  IF NEW.target_type = 'individual' THEN
    -- Direct assignment to specific user
    INSERT INTO public.gw_notifications (
      user_id, title, message, type, related_id, action_url
    ) VALUES (
      NEW.target_value::UUID,
      'New Assignment: ' || NEW.title,
      'You have a new ' || NEW.assignment_type || ' assignment due on ' || 
      TO_CHAR(NEW.due_date, 'Month DD, YYYY'),
      'assignment',
      NEW.id,
      '/member-sight-reading-studio'
    );
    
  ELSIF NEW.target_type = 'section' THEN
    -- Assignment to all users in a section
    FOR user_profile IN 
      SELECT user_id FROM public.gw_profiles 
      WHERE voice_part = NEW.target_value AND role = 'member'
    LOOP
      INSERT INTO public.gw_notifications (
        user_id, title, message, type, related_id, action_url
      ) VALUES (
        user_profile.user_id,
        'New Assignment: ' || NEW.title,
        'You have a new ' || NEW.assignment_type || ' assignment for your section due on ' || 
        TO_CHAR(NEW.due_date, 'Month DD, YYYY'),
        'assignment',
        NEW.id,
        '/member-sight-reading-studio'
      );
    END LOOP;
    
  ELSIF NEW.target_type = 'class' THEN
    -- Assignment to all users in a class year
    FOR user_profile IN 
      SELECT user_id FROM public.gw_profiles 
      WHERE academic_year = NEW.target_value AND role = 'member'
    LOOP
      INSERT INTO public.gw_notifications (
        user_id, title, message, type, related_id, action_url
      ) VALUES (
        user_profile.user_id,
        'New Assignment: ' || NEW.title,
        'You have a new ' || NEW.assignment_type || ' assignment for your class due on ' || 
        TO_CHAR(NEW.due_date, 'Month DD, YYYY'),
        'assignment',
        NEW.id,
        '/member-sight-reading-studio'
      );
    END LOOP;
    
  ELSIF NEW.target_type = 'all' THEN
    -- Assignment to all members
    FOR user_profile IN 
      SELECT user_id FROM public.gw_profiles 
      WHERE role = 'member'
    LOOP
      INSERT INTO public.gw_notifications (
        user_id, title, message, type, related_id, action_url
      ) VALUES (
        user_profile.user_id,
        'New Assignment: ' || NEW.title,
        'You have a new ' || NEW.assignment_type || ' assignment due on ' || 
        TO_CHAR(NEW.due_date, 'Month DD, YYYY'),
        'assignment',
        NEW.id,
        '/member-sight-reading-studio'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for assignment notifications
CREATE TRIGGER create_assignment_notifications_trigger
AFTER INSERT ON public.gw_sight_reading_assignments
FOR EACH ROW
EXECUTE FUNCTION public.create_assignment_notifications();
-- Create table for student class schedules
CREATE TABLE public.student_class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester TEXT NOT NULL DEFAULT 'Spring 2026',
  course_name TEXT NOT NULL,
  course_code TEXT,
  days TEXT[] NOT NULL, -- ['Monday', 'Wednesday', 'Friday'] etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  instructor_name TEXT,
  notes TEXT,
  has_conflict BOOLEAN DEFAULT false,
  conflict_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_class_schedules ENABLE ROW LEVEL SECURITY;

-- Students can manage their own schedules
CREATE POLICY "Users can manage their own class schedules"
ON public.student_class_schedules
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins/exec board can view all schedules
CREATE POLICY "Admins and exec board can view all class schedules"
ON public.student_class_schedules
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

-- Create index for faster lookups
CREATE INDEX idx_student_class_schedules_user_id ON public.student_class_schedules(user_id);
CREATE INDEX idx_student_class_schedules_semester ON public.student_class_schedules(semester);

-- Create function to check for rehearsal conflicts
CREATE OR REPLACE FUNCTION check_rehearsal_conflict()
RETURNS TRIGGER AS $$
DECLARE
  rehearsal_start TIME := '17:00:00'; -- 5:00 PM
  rehearsal_end TIME := '18:15:00';   -- 6:15 PM
  rehearsal_days TEXT[] := ARRAY['Monday', 'Wednesday', 'Friday'];
  overlapping_days TEXT[];
  conflict_text TEXT := '';
BEGIN
  -- Find days that overlap with rehearsal schedule
  SELECT ARRAY_AGG(d) INTO overlapping_days
  FROM unnest(NEW.days) AS d
  WHERE d = ANY(rehearsal_days);
  
  -- Check if there's a time overlap on rehearsal days
  IF overlapping_days IS NOT NULL AND array_length(overlapping_days, 1) > 0 THEN
    -- Check for time overlap: class ends after rehearsal starts AND class starts before rehearsal ends
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

-- Create trigger to automatically check conflicts
CREATE TRIGGER check_class_schedule_conflict
BEFORE INSERT OR UPDATE ON public.student_class_schedules
FOR EACH ROW
EXECUTE FUNCTION check_rehearsal_conflict();

-- Create view for secretary to see all schedules with student info
CREATE OR REPLACE VIEW student_schedules_with_profiles AS
SELECT 
  scs.*,
  gp.full_name,
  gp.first_name,
  gp.last_name,
  gp.email,
  gp.voice_part,
  gp.avatar_url,
  gp.class_year
FROM public.student_class_schedules scs
JOIN public.gw_profiles gp ON scs.user_id = gp.user_id;

-- Grant access to view
GRANT SELECT ON student_schedules_with_profiles TO authenticated;
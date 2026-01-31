-- Create table for tracking individual performance grades
CREATE TABLE public.gw_performance_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_profile_id UUID NOT NULL REFERENCES public.gw_profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  performance_name VARCHAR(100) NOT NULL,
  performance_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'participated', 'excused', 'absent')),
  notes TEXT,
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one grade per student per performance per course
  UNIQUE(student_profile_id, course_id, performance_name)
);

-- Enable RLS
ALTER TABLE public.gw_performance_grades ENABLE ROW LEVEL SECURITY;

-- Students can view their own performance grades
CREATE POLICY "Students can view own performance grades"
  ON public.gw_performance_grades
  FOR SELECT
  USING (
    student_profile_id IN (
      SELECT id FROM public.gw_profiles WHERE user_id = auth.uid()
    )
  );

-- Admins, super_admins, and secretaries can manage all performance grades
CREATE POLICY "Admins can manage all performance grades"
  ON public.gw_performance_grades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'secretary')
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'secretary')
        AND is_active = true
    )
  );

-- Create index for faster queries
CREATE INDEX idx_gw_performance_grades_student ON public.gw_performance_grades(student_profile_id);
CREATE INDEX idx_gw_performance_grades_course ON public.gw_performance_grades(course_id);
CREATE INDEX idx_gw_performance_grades_lookup ON public.gw_performance_grades(course_id, performance_name);

-- Trigger for updated_at
CREATE TRIGGER update_gw_performance_grades_updated_at
  BEFORE UPDATE ON public.gw_performance_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Create courses table for Glee Academy
CREATE TABLE IF NOT EXISTS public.glee_academy_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code VARCHAR(20) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  credits INTEGER DEFAULT 2,
  instructor_name TEXT,
  instructor_email TEXT,
  instructor_office TEXT,
  instructor_office_hours TEXT,
  meeting_times TEXT,
  location TEXT,
  semester TEXT,
  syllabus_data JSONB, -- Store full syllabus structure
  is_active BOOLEAN DEFAULT true,
  max_students INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create course enrollments table
CREATE TABLE IF NOT EXISTS public.glee_academy_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.glee_academy_courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  enrollment_status VARCHAR(20) DEFAULT 'pending' CHECK (enrollment_status IN ('pending', 'approved', 'enrolled', 'waitlisted', 'dropped', 'completed')),
  enrollment_date TIMESTAMPTZ DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  grade VARCHAR(5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, student_id)
);

-- Enable RLS
ALTER TABLE public.glee_academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glee_academy_enrollments ENABLE ROW LEVEL SECURITY;

-- Courses policies (public can view active courses)
CREATE POLICY "Anyone can view active courses"
  ON public.glee_academy_courses
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage courses"
  ON public.glee_academy_courses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Enrollment policies
CREATE POLICY "Students can view their own enrollments"
  ON public.glee_academy_enrollments
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can register for courses"
  ON public.glee_academy_enrollments
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins can manage all enrollments"
  ON public.glee_academy_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles
      WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create indexes
CREATE INDEX idx_enrollments_student ON public.glee_academy_enrollments(student_id);
CREATE INDEX idx_enrollments_course ON public.glee_academy_enrollments(course_id);
CREATE INDEX idx_enrollments_status ON public.glee_academy_enrollments(enrollment_status);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.glee_academy_courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.glee_academy_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
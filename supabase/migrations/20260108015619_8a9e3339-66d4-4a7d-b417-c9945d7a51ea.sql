-- Create a simple student profiles table for non-Glee Club students (MUS-240, etc.)
CREATE TABLE IF NOT EXISTS public.gw_student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL, -- NULL until student signs up/links account
  student_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  academic_year TEXT, -- Freshman, Sophomore, etc.
  major TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_student_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for student profiles
CREATE POLICY "Admins and instructors can view all student profiles"
  ON public.gw_student_profiles FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert student profiles"
  ON public.gw_student_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update student profiles"
  ON public.gw_student_profiles FOR UPDATE
  USING (true);

-- Add student_profile_id to enrollments for non-Glee students
ALTER TABLE public.gw_course_enrollments 
ADD COLUMN IF NOT EXISTS student_profile_id UUID REFERENCES public.gw_student_profiles(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_gw_student_profiles_student_id ON public.gw_student_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_gw_course_enrollments_student_profile_id ON public.gw_course_enrollments(student_profile_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_gw_student_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_student_profiles_timestamp
  BEFORE UPDATE ON public.gw_student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_gw_student_profiles_updated_at();
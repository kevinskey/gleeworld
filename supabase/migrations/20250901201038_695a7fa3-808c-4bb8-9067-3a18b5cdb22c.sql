-- Create MUS 240 course enrollment table
CREATE TABLE public.mus240_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester TEXT NOT NULL DEFAULT 'Fall 2025',
  enrollment_status TEXT NOT NULL DEFAULT 'enrolled' CHECK (enrollment_status IN ('enrolled', 'dropped', 'withdrawn', 'completed')),
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  final_grade TEXT,
  instructor_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, semester)
);

-- Enable RLS
ALTER TABLE public.mus240_enrollments ENABLE ROW LEVEL SECURITY;

-- Students can view their own enrollment
CREATE POLICY "Students can view their own enrollment"
ON public.mus240_enrollments
FOR SELECT
USING (auth.uid() = student_id);

-- Admins can manage all enrollments
CREATE POLICY "Admins can manage all enrollments"
ON public.mus240_enrollments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Instructors can insert and update enrollments
CREATE POLICY "Instructors can manage enrollments"
ON public.mus240_enrollments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_mus240_enrollments_updated_at
BEFORE UPDATE ON public.mus240_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check MUS 240 enrollment
CREATE OR REPLACE FUNCTION public.is_enrolled_in_mus240(user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mus240_enrollments
    WHERE student_id = user_id_param 
    AND enrollment_status = 'enrolled'
  );
$$;
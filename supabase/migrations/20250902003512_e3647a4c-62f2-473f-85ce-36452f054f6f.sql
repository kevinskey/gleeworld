-- Create MUS 240 enrollments table with correct foreign key
CREATE TABLE IF NOT EXISTS public.mus240_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester TEXT NOT NULL DEFAULT 'Fall 2024',
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'completed')),
  final_grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique enrollment per user per semester
  UNIQUE(user_id, semester)
);

-- Enable RLS
ALTER TABLE public.mus240_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for mus240_enrollments
CREATE POLICY "Students can view their own enrollment" 
ON public.mus240_enrollments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments" 
ON public.mus240_enrollments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Admins can manage all enrollments" 
ON public.mus240_enrollments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_mus240_enrollments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mus240_enrollments_updated_at
  BEFORE UPDATE ON public.mus240_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mus240_enrollments_updated_at();

-- Insert sample enrollments for existing journal entries (students who have already submitted journals)
INSERT INTO public.mus240_enrollments (user_id, semester, enrolled_at, status)
SELECT DISTINCT 
  student_id,
  'Fall 2024',
  '2024-08-15 00:00:00+00'::timestamp with time zone,
  'active'
FROM public.mus240_journal_entries 
WHERE student_id IS NOT NULL
ON CONFLICT (user_id, semester) DO NOTHING;
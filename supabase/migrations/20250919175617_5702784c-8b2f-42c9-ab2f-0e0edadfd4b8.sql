-- Create RLS policies for MUS240 enrollments table
-- Create a policy to allow students to view their own enrollment
CREATE POLICY "Students can view own enrollment" 
ON public.mus240_enrollments 
FOR SELECT 
USING (auth.uid() = student_id);

-- Allow admins to view all enrollments
CREATE POLICY "Admins can view all enrollments" 
ON public.mus240_enrollments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow admins to manage enrollments (insert, update, delete)
CREATE POLICY "Admins can manage all enrollments" 
ON public.mus240_enrollments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add some test enrollments using actual user IDs
INSERT INTO public.mus240_enrollments (student_id, semester, enrollment_status, enrolled_at) 
VALUES 
  ('b4eaed0e-6fe7-4060-90d9-2d96a604f404', 'Fall 2025', 'enrolled', now()),
  ('3174dc79-ce30-4199-bf76-c6d60971ba0b', 'Fall 2025', 'enrolled', now()),
  ('96d0f845-cd24-4685-b0be-343decfd32c0', 'Fall 2025', 'enrolled', now()),
  ('10daa1a0-7e12-4db5-8124-1906609c2a1b', 'Fall 2025', 'enrolled', now()),
  ('2dacd89c-5673-41cd-92b9-469b03e94683', 'Fall 2025', 'enrolled', now())
ON CONFLICT (student_id, semester) DO NOTHING;
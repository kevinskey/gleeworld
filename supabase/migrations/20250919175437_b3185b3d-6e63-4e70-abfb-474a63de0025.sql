-- Add sample MUS240 enrollments for testing
-- Note: This uses placeholder user IDs - in production, use actual user IDs

-- Insert sample enrollments for MUS240 students
INSERT INTO public.mus240_enrollments (student_id, semester, enrollment_status, enrolled_at) 
VALUES 
  -- Add some sample enrollments with common user IDs from auth.users
  -- You'll need to replace these with actual user IDs from your system
  ('00000000-0000-0000-0000-000000000000', 'Fall 2025', 'enrolled', now()),
  ('11111111-1111-1111-1111-111111111111', 'Fall 2025', 'enrolled', now()),
  ('22222222-2222-2222-2222-222222222222', 'Fall 2025', 'enrolled', now())
ON CONFLICT (student_id, semester) DO NOTHING;

-- Create a policy to allow students to view their own enrollment
CREATE POLICY "Students can view own enrollment" 
ON public.mus240_enrollments 
FOR SELECT 
USING (auth.uid() = student_id);

-- Also allow admins to view all enrollments
CREATE POLICY "Admins can view all enrollments" 
ON public.mus240_enrollments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);
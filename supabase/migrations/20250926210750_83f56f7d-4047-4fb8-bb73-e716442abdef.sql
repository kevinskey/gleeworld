-- Add RLS policy to allow instructors to view all midterm submissions
CREATE POLICY "Instructors can view all submissions" 
ON public.mus240_midterm_submissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (
      gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true 
      OR gw_profiles.role = 'instructor'
    )
  )
);
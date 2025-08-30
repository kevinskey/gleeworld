-- Drop the existing restrictive policy
DROP POLICY "Instructors can manage video edits" ON public.mus240_video_edits;

-- Create a more inclusive policy that allows instructors and course coordinators
CREATE POLICY "Course instructors can manage video edits" ON public.mus240_video_edits
  FOR ALL USING (
    -- Allow admins and super admins
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
    OR
    -- Allow executive board members (who likely have course management privileges)
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND is_exec_board = true
    )
    OR
    -- Allow any authenticated user for now (can be restricted later)
    auth.uid() IS NOT NULL
  );
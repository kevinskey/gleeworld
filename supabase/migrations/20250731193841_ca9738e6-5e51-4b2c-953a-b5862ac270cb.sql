-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Executive board members can delete audition logs" ON public.gw_audition_logs;

-- Create a more comprehensive delete policy that also checks profiles table
CREATE POLICY "Executive board members and admins can delete audition logs" 
ON public.gw_audition_logs 
FOR DELETE 
USING (
  -- Check gw_executive_board_members
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) 
  OR 
  -- Check gw_profiles admin status
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
  OR
  -- Check profiles table role (fallback)
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);
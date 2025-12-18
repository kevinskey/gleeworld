-- Drop existing admin-only policy
DROP POLICY IF EXISTS "Admins can view all exit interviews" ON member_exit_interviews;

-- Create expanded policy to include tour managers and secretary
CREATE POLICY "Admins, tour managers, and secretary can view all exit interviews" 
ON member_exit_interviews 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR is_gw_admin_v2()
  OR is_current_user_tour_manager()
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND exec_board_role = 'secretary'
    AND is_exec_board = true
  )
);
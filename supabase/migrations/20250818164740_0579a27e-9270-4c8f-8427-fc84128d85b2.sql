-- Add policy to allow executive board members to view all profiles for user management
CREATE POLICY "gw_profiles_exec_board_view_all" 
ON public.gw_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);
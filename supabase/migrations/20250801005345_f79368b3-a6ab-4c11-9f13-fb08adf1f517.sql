-- Add policy to allow treasurers and admins to view all profiles for dues management
CREATE POLICY "Treasurers and admins can view all profiles"
ON public.gw_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'treasurer' 
    AND is_active = true
  ) OR 
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);
-- Update gw_profiles update policy to allow exec board members to update voice parts
DROP POLICY IF EXISTS "gw_profiles_update_policy" ON public.gw_profiles;

CREATE POLICY "gw_profiles_update_policy" ON public.gw_profiles
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() 
  OR is_gw_admin_v2()
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND is_exec_board = true
  )
)
WITH CHECK (
  user_id = auth.uid() 
  OR is_gw_admin_v2()
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND is_exec_board = true
  )
);
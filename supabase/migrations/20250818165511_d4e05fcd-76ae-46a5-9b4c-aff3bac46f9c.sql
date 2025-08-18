-- First, create a security definer function to check if user is executive board member
CREATE OR REPLACE FUNCTION public.is_user_executive_board_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

-- Now create the safe policy using the function
CREATE POLICY "gw_profiles_exec_board_view_all" 
ON public.gw_profiles 
FOR SELECT 
USING (public.is_user_executive_board_member());
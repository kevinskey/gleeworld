-- Create function to check if current user is alumnae liaison
CREATE OR REPLACE FUNCTION public.is_alumnae_liaison()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'alumnae_liaison' 
    AND is_active = true
  );
$$;

-- Create policy for alumnae liaison to view all alumnae profiles
CREATE POLICY "Alumnae liaisons can view alumnae profiles" 
ON public.gw_profiles 
FOR SELECT 
USING (
  (role = 'alumna' AND public.is_alumnae_liaison()) OR
  (user_id = auth.uid()) OR
  (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))
);

-- Create policy for alumnae liaison to update alumnae profiles
CREATE POLICY "Alumnae liaisons can update alumnae profiles" 
ON public.gw_profiles 
FOR UPDATE 
USING (
  (role = 'alumna' AND public.is_alumnae_liaison()) OR
  (user_id = auth.uid()) OR
  (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))
)
WITH CHECK (
  (role = 'alumna' AND public.is_alumnae_liaison()) OR
  (user_id = auth.uid()) OR
  (EXISTS (SELECT 1 FROM public.gw_profiles WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)))
);
-- Drop the problematic recursive policies on gw_profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Exec board can view admin fields" ON public.gw_profiles;

-- Create non-recursive policies using the profiles table for role checking
CREATE POLICY "Admins can insert profiles" 
ON public.gw_profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Admins can update any profile" 
ON public.gw_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Admins can view admin fields" 
ON public.gw_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);
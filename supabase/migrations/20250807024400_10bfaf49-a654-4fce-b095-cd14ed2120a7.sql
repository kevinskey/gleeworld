-- Add SELECT policy for setlists table
CREATE POLICY "Users can view their own setlists" 
ON public.setlists 
FOR SELECT 
USING (created_by = auth.uid());

-- Add policy for admins to view all setlists
CREATE POLICY "Admins can view all setlists" 
ON public.setlists 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Add policy for public setlists to be viewable by all authenticated users
CREATE POLICY "Authenticated users can view public setlists" 
ON public.setlists 
FOR SELECT 
USING (is_public = true AND auth.role() = 'authenticated');
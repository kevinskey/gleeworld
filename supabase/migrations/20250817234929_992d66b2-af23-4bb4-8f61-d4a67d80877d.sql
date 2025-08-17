-- Add RLS policies for gw_modules table
CREATE POLICY "Allow authenticated users to view modules" 
ON public.gw_modules 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage modules" 
ON public.gw_modules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);
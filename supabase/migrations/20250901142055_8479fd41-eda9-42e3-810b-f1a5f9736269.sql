-- Create admin policies for gw_hero_slides table
-- Allow admins to manage hero slides

-- Policy for admins to insert hero slides
CREATE POLICY "Admins can insert hero slides" 
ON public.gw_hero_slides 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Policy for admins to update hero slides
CREATE POLICY "Admins can update hero slides" 
ON public.gw_hero_slides 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Policy for admins to delete hero slides
CREATE POLICY "Admins can delete hero slides" 
ON public.gw_hero_slides 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);
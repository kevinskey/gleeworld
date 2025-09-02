-- Create RLS policies for username_permissions table to allow admins to manage permissions

-- Allow admins to view all username permissions
CREATE POLICY "Admins can view all username permissions" 
ON public.username_permissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow admins to insert username permissions
CREATE POLICY "Admins can insert username permissions" 
ON public.username_permissions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow admins to update username permissions
CREATE POLICY "Admins can update username permissions" 
ON public.username_permissions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow admins to delete username permissions
CREATE POLICY "Admins can delete username permissions" 
ON public.username_permissions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);
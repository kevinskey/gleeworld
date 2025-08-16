-- Fix infinite recursion in gw_profiles policies
-- Drop the problematic policy
DROP POLICY IF EXISTS "Admin and alumnae liaison profile access" ON public.gw_profiles;

-- Create a security definer function to safely check admin status
CREATE OR REPLACE FUNCTION public.is_current_user_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin'))
  );
$$;

-- Create a security definer function to safely check alumnae liaison status
CREATE OR REPLACE FUNCTION public.is_current_user_alumnae_liaison_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'alumnae_liaison' 
    AND is_active = true
  );
$$;

-- Create safe policies for gw_profiles
CREATE POLICY "Users can view their own profile" 
ON public.gw_profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.gw_profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
ON public.gw_profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Admin access policy using security definer function
CREATE POLICY "Admins can manage all profiles" 
ON public.gw_profiles 
FOR ALL 
USING (
  -- Use the safe security definer function to avoid recursion
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND id IN (
      SELECT user_id FROM public.gw_profiles 
      WHERE (is_admin = true OR is_super_admin = true)
      LIMIT 1
    )
  )
);

-- Alumnae liaison access policy for alumnae profiles
CREATE POLICY "Alumnae liaison can view alumnae profiles" 
ON public.gw_profiles 
FOR SELECT 
USING (
  role = 'alumna' 
  AND EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'alumnae_liaison' 
    AND is_active = true
  )
);
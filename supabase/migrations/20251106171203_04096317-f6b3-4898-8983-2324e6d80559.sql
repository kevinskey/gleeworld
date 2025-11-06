-- Fix RLS policies for alumnae_global_settings to use has_role function

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view global settings" ON alumnae_global_settings;
DROP POLICY IF EXISTS "Admins can update global settings" ON alumnae_global_settings;
DROP POLICY IF EXISTS "Admins can insert global settings" ON alumnae_global_settings;
DROP POLICY IF EXISTS "Admins can delete global settings" ON alumnae_global_settings;

-- Create new policies using has_role function
CREATE POLICY "Admins can view global settings"
ON alumnae_global_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert global settings"
ON alumnae_global_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update global settings"
ON alumnae_global_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete global settings"
ON alumnae_global_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
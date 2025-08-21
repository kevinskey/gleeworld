-- Drop all existing INSERT-related policies that might conflict
DROP POLICY IF EXISTS "Users can manage appointments" ON public.gw_appointments;
DROP POLICY IF EXISTS "Users can manage their own appointments and admins can manage a" ON public.gw_appointments;
DROP POLICY IF EXISTS "Public can book appointments" ON public.gw_appointments;

-- Create a simple, clear policy for public appointment booking
CREATE POLICY "Allow public appointment booking" ON public.gw_appointments
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Recreate the user management policy but only for authenticated users and exclude INSERT
CREATE POLICY "Authenticated users can manage their appointments" ON public.gw_appointments
FOR ALL 
TO authenticated
USING (
  (assigned_to = auth.uid()) OR 
  (created_by = auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM gw_profiles gp
    WHERE gp.user_id = auth.uid() 
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  ))
)
WITH CHECK (
  (assigned_to = auth.uid()) OR 
  (created_by = auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM gw_profiles gp
    WHERE gp.user_id = auth.uid() 
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  ))
);
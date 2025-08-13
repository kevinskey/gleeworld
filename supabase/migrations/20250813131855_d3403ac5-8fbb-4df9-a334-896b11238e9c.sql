-- Enable appointment types that were disabled
UPDATE gw_appointment_types SET is_active = true WHERE is_active = false;

-- Create a simple function to check if user has basic admin access for appointments
CREATE OR REPLACE FUNCTION public.can_manage_appointments()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin', 'secretary', 'executive'))
  ) OR auth.uid() IS NOT NULL;
$$;

-- Allow authenticated users to view appointment types
DROP POLICY IF EXISTS "Users can view appointment types" ON gw_appointment_types;
CREATE POLICY "Users can view appointment types"
ON gw_appointment_types
FOR SELECT
TO authenticated
USING (is_active = true);

-- Allow admin users to manage appointment types
DROP POLICY IF EXISTS "Admins can manage appointment types" ON gw_appointment_types;
CREATE POLICY "Admins can manage appointment types"
ON gw_appointment_types
FOR ALL
TO authenticated
USING (can_manage_appointments())
WITH CHECK (can_manage_appointments());

-- Ensure appointments table has proper policies for authenticated users
DROP POLICY IF EXISTS "Users can view appointments" ON gw_appointments;
CREATE POLICY "Users can view appointments"
ON gw_appointments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can manage appointments" ON gw_appointments;
CREATE POLICY "Users can manage appointments"
ON gw_appointments
FOR ALL
TO authenticated
USING (can_manage_appointments())
WITH CHECK (can_manage_appointments());
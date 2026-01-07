-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can manage calendars" ON public.gw_calendars;

-- Create proper UPDATE policy for admins
CREATE POLICY "Admins can update calendars" 
ON public.gw_calendars 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE gw_profiles.user_id = auth.uid() 
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
    )
    OR created_by = auth.uid()
    OR created_by IS NULL
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE gw_profiles.user_id = auth.uid() 
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
    )
    OR created_by = auth.uid()
    OR created_by IS NULL
  )
);

-- Create DELETE policy for admins
CREATE POLICY "Admins can delete calendars" 
ON public.gw_calendars 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE gw_profiles.user_id = auth.uid() 
      AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
    )
    OR created_by = auth.uid()
  )
);
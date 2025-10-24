
-- Fix RLS policy for group_updates_mus240 to handle both role formats
DROP POLICY IF EXISTS "Admins can update all updates" ON group_updates_mus240;

CREATE POLICY "Admins can update all updates"
ON group_updates_mus240
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (
      gw_profiles.role IN ('admin', 'super-admin', 'super_admin')
      OR gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true
    )
  )
);

-- Also fix the insert policy for admins
DROP POLICY IF EXISTS "Admins can insert updates" ON group_updates_mus240;

CREATE POLICY "Admins can insert updates"
ON group_updates_mus240
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (
      gw_profiles.role IN ('admin', 'super-admin', 'super_admin')
      OR gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true
    )
  )
);

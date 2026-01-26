-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage messenger groups" ON messenger_groups;
DROP POLICY IF EXISTS "Admins can manage messenger group members" ON messenger_group_members;

-- Create new policies that check gw_profiles instead of app_roles
CREATE POLICY "Admins can manage messenger groups" ON messenger_groups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.is_admin = true 
      OR p.is_super_admin = true 
      OR p.is_exec_board = true
      OR p.role IN ('admin', 'super_admin')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.is_admin = true 
      OR p.is_super_admin = true 
      OR p.is_exec_board = true
      OR p.role IN ('admin', 'super_admin')
    )
  )
);

CREATE POLICY "Admins can manage messenger group members" ON messenger_group_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.is_admin = true 
      OR p.is_super_admin = true 
      OR p.is_exec_board = true
      OR p.role IN ('admin', 'super_admin')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (
      p.is_admin = true 
      OR p.is_super_admin = true 
      OR p.is_exec_board = true
      OR p.role IN ('admin', 'super_admin')
    )
  )
);
-- Update RLS policies for gw_running_ledger to check module permissions

-- Drop existing policies
DROP POLICY IF EXISTS "Treasurer and admins can view all ledger entries" ON gw_running_ledger;
DROP POLICY IF EXISTS "Treasurer and admins can create ledger entries" ON gw_running_ledger;
DROP POLICY IF EXISTS "Treasurer and admins can update ledger entries" ON gw_running_ledger;
DROP POLICY IF EXISTS "Treasurer and admins can delete ledger entries" ON gw_running_ledger;

-- SELECT: Users with glee-ledger module permission, treasurer, or admins can view
CREATE POLICY "Users with ledger access can view entries"
ON gw_running_ledger
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_user_module_permissions 
    WHERE user_id = auth.uid() 
    AND module_id = 'glee-ledger' 
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE user_id = auth.uid() 
    AND position = 'treasurer'
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- INSERT: Users with glee-ledger module permission, treasurer, or admins can create
CREATE POLICY "Users with ledger access can create entries"
ON gw_running_ledger
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_user_module_permissions 
    WHERE user_id = auth.uid() 
    AND module_id = 'glee-ledger' 
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE user_id = auth.uid() 
    AND position = 'treasurer'
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- UPDATE: Users with glee-ledger module permission, treasurer, or admins can update
CREATE POLICY "Users with ledger access can update entries"
ON gw_running_ledger
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_user_module_permissions 
    WHERE user_id = auth.uid() 
    AND module_id = 'glee-ledger' 
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE user_id = auth.uid() 
    AND position = 'treasurer'
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- DELETE: Users with glee-ledger module permission, treasurer, or admins can delete
CREATE POLICY "Users with ledger access can delete entries"
ON gw_running_ledger
FOR DELETE
TO authenticated
USING (
  (auth.uid() = created_by)  -- Users can delete their own entries
  OR EXISTS (
    SELECT 1 FROM gw_user_module_permissions 
    WHERE user_id = auth.uid() 
    AND module_id = 'glee-ledger' 
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE user_id = auth.uid() 
    AND position = 'treasurer'
    AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);
-- Enable RLS on gw_running_ledger table
ALTER TABLE gw_running_ledger ENABLE ROW LEVEL SECURITY;

-- Policy: Allow super admins full access
CREATE POLICY "Super admins have full access to running ledger"
ON gw_running_ledger
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.is_super_admin = true
  )
);

-- Policy: Allow users with glee-ledger module permission to view entries
CREATE POLICY "Users with glee-ledger permission can view entries"
ON gw_running_ledger
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_user_module_permissions ump
    WHERE ump.user_id = auth.uid()
    AND ump.module_id = 'glee-ledger'
    AND ump.is_active = true
  )
);

-- Policy: Allow users with glee-ledger module permission to insert entries
CREATE POLICY "Users with glee-ledger permission can insert entries"
ON gw_running_ledger
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_user_module_permissions ump
    WHERE ump.user_id = auth.uid()
    AND ump.module_id = 'glee-ledger'
    AND ump.is_active = true
  )
  AND created_by = auth.uid()
);

-- Policy: Allow users with glee-ledger module permission to update entries
CREATE POLICY "Users with glee-ledger permission can update entries"
ON gw_running_ledger
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM gw_user_module_permissions ump
    WHERE ump.user_id = auth.uid()
    AND ump.module_id = 'glee-ledger'
    AND ump.is_active = true
  )
);

-- Policy: Allow users with glee-ledger module permission to delete entries
CREATE POLICY "Users with glee-ledger permission can delete entries"
ON gw_running_ledger
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM gw_user_module_permissions ump
    WHERE ump.user_id = auth.uid()
    AND ump.module_id = 'glee-ledger'
    AND ump.is_active = true
  )
);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_running_ledger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_running_ledger_updated_at
BEFORE UPDATE ON gw_running_ledger
FOR EACH ROW
EXECUTE FUNCTION update_running_ledger_updated_at();
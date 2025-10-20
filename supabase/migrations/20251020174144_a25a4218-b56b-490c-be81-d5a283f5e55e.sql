-- Fix RLS policies for mus240_journal_entries to ensure proper INSERT and UPDATE permissions
-- Drop and recreate admin policy with proper with_check
DROP POLICY IF EXISTS "admins_all_access_entries" ON mus240_journal_entries;

CREATE POLICY "admins_all_access_entries"
ON mus240_journal_entries
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Also ensure student update policy has with_check for updating their own entries
DROP POLICY IF EXISTS "students_update_own_entries" ON mus240_journal_entries;

CREATE POLICY "students_update_own_entries"
ON mus240_journal_entries
FOR UPDATE
TO public
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);
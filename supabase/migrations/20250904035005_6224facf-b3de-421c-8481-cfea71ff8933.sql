-- Update RLS policies for gw_dues_records to include admin users from gw_profiles
-- Drop existing policies and recreate with proper admin access

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'gw_dues_records' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.gw_dues_records', pol.policyname);
    END LOOP;
END$$;

-- Policy 1: Users can view their own dues records
CREATE POLICY "gw_dues_records_user_view_own"
ON public.gw_dues_records
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Admins and executive board can view all dues records  
CREATE POLICY "gw_dues_records_admin_view_all"
ON public.gw_dues_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Policy 3: Admins and executive board can insert dues records
CREATE POLICY "gw_dues_records_admin_insert"
ON public.gw_dues_records
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Policy 4: Admins and executive board can update dues records
CREATE POLICY "gw_dues_records_admin_update"
ON public.gw_dues_records
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Policy 5: Admins and executive board can delete dues records
CREATE POLICY "gw_dues_records_admin_delete"
ON public.gw_dues_records
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);
-- Check and fix RLS policies for gw_dues_records table
-- First, check what policies exist
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'gw_dues_records' AND schemaname = 'public';

-- Drop existing problematic policies and create new ones
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

-- Create simple, working policies for gw_dues_records
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
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
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
  )
);
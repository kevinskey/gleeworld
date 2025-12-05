-- Drop the hardcoded update policy and replace with exec board check
DROP POLICY IF EXISTS "Only authorized users can update ticket requests" ON concert_ticket_requests;

-- Create new update policy that allows exec board, admin, and super admin to update
CREATE POLICY "Exec board can update ticket requests" 
ON concert_ticket_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE gw_profiles.user_id = auth.uid() 
    AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);
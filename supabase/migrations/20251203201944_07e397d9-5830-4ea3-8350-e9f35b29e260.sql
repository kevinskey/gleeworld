-- Add policy for exec board members to view ticket requests
CREATE POLICY "Exec board can view ticket requests"
ON public.concert_ticket_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Add policy for exec board members to update ticket requests
CREATE POLICY "Exec board can update ticket requests"
ON public.concert_ticket_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);

-- Drop old admin-only policies since new ones cover admins too
DROP POLICY IF EXISTS "Admins can view all ticket requests" ON public.concert_ticket_requests;
DROP POLICY IF EXISTS "Admins can update ticket requests" ON public.concert_ticket_requests;
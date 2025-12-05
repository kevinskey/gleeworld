-- Drop and recreate the UPDATE policy with proper WITH CHECK
DROP POLICY IF EXISTS "Exec board can update ticket requests" ON public.concert_ticket_requests;

CREATE POLICY "Exec board can update ticket requests"
ON public.concert_ticket_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
);
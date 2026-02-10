-- Drop the restrictive policy that only allows tour_manager/secretary
DROP POLICY IF EXISTS "Admins and authorized users can manage all hosts" ON public.hosts;

-- Create a new policy that allows all exec board members (plus admins) to manage hosts
CREATE POLICY "Admins and exec board can manage hosts"
ON public.hosts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  )
);
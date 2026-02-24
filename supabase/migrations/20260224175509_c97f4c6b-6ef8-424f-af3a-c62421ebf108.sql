
-- Fix contract_signatures_v2: allow admins and exec board, not just super admins
DROP POLICY IF EXISTS "Super admins can manage all contract signatures v2" ON public.contract_signatures_v2;

CREATE POLICY "Admins and exec board can manage contract signatures v2"
ON public.contract_signatures_v2
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

-- Fix hosts: allow admins (not just exec board) to view
DROP POLICY IF EXISTS "Executive board can view hosts" ON public.hosts;

CREATE POLICY "Authenticated admins and exec can view hosts"
ON public.hosts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  )
);

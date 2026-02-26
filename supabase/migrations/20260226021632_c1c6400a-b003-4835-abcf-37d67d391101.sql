
-- Drop the existing restrictive ALL policy on contracts_v2
DROP POLICY IF EXISTS "Admins and tour managers can manage contracts_v2" ON public.contracts_v2;

-- Recreate it to also include exec board members
CREATE POLICY "Admins exec board and tour managers can manage contracts_v2"
ON public.contracts_v2
FOR ALL
USING (
  (EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  ))
  OR is_current_user_tour_manager()
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  ))
  OR is_current_user_tour_manager()
);

-- Clean up conflicting/duplicate policies on contracts_v2
DROP POLICY IF EXISTS "Allow anyone to update contracts" ON public.contracts_v2;
DROP POLICY IF EXISTS "Allow anyone to insert contracts" ON public.contracts_v2;
DROP POLICY IF EXISTS "Allow anyone to select contracts" ON public.contracts_v2;

-- Ensure the main admin/tour manager policy covers ALL operations properly
DROP POLICY IF EXISTS "Admins and tour managers can manage contracts_v2" ON public.contracts_v2;

CREATE POLICY "Admins and tour managers can manage contracts_v2" 
ON public.contracts_v2
FOR ALL 
USING (
  (EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  ))
  OR public.is_current_user_tour_manager()
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  ))
  OR public.is_current_user_tour_manager()
);
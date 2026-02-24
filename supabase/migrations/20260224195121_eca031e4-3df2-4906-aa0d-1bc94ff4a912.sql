
DROP POLICY "Admins can manage hotels" ON public.gw_tour_hotels;

CREATE POLICY "Admins and executives can manage hotels"
ON public.gw_tour_hotels
FOR ALL
USING (
  (EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.role IN ('admin', 'superadmin', 'super-admin', 'executive')
  ))
  OR
  (EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE gw_executive_board_members.user_id = auth.uid()
    AND gw_executive_board_members.is_active = true
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND gw_profiles.role IN ('admin', 'superadmin', 'super-admin', 'executive')
  ))
  OR
  (EXISTS (
    SELECT 1 FROM gw_executive_board_members
    WHERE gw_executive_board_members.user_id = auth.uid()
    AND gw_executive_board_members.is_active = true
  ))
);

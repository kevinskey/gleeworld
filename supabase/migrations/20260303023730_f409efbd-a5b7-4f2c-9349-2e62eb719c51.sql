
-- Drop old policies
DROP POLICY IF EXISTS "Admins can manage checkins" ON public.gw_tour_checkins;
DROP POLICY IF EXISTS "Members can view checkins" ON public.gw_tour_checkins;
DROP POLICY IF EXISTS "Members can check in" ON public.gw_tour_checkin_responses;
DROP POLICY IF EXISTS "Members can view own responses" ON public.gw_tour_checkin_responses;
DROP POLICY IF EXISTS "Admins can view all responses" ON public.gw_tour_checkin_responses;

-- Recreate using app_roles table
CREATE POLICY "Admins can manage checkins"
  ON public.gw_tour_checkins FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','executive_board','tour_manager') AND is_active = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','executive_board','tour_manager') AND is_active = true)
  );

CREATE POLICY "Members can view checkins"
  ON public.gw_tour_checkins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can check in"
  ON public.gw_tour_checkin_responses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can view own responses"
  ON public.gw_tour_checkin_responses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all responses"
  ON public.gw_tour_checkin_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin','executive_board','tour_manager') AND is_active = true)
  );

-- Add Onnesty to app_roles as tour_manager so she can see roll call responses
INSERT INTO public.app_roles (user_id, role, is_active)
VALUES ('b648f12d-9a63-4eae-b768-413a467567b4', 'tour_manager', true)
ON CONFLICT DO NOTHING;

-- Also update the RLS policy to additionally check gw_profiles.exec_board_role
-- so future tour managers don't need manual app_roles entries
DROP POLICY IF EXISTS "Admins can view all responses" ON public.gw_tour_checkin_responses;
CREATE POLICY "Admins can view all responses"
  ON public.gw_tour_checkin_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin','super_admin','executive_board','tour_manager') 
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (
        is_admin = true 
        OR is_super_admin = true 
        OR is_exec_board = true 
        OR exec_board_role = 'tour_manager'
      )
    )
  );
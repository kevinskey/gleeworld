CREATE OR REPLACE FUNCTION public.is_current_user_tour_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.gw_executive_board_members
      WHERE user_id = auth.uid()
        AND position::text = 'tour_manager'
        AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.app_roles
      WHERE user_id = auth.uid()
        AND role = 'tour_manager'
        AND coalesce(is_active, true) = true
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.gw_profiles
      WHERE user_id = auth.uid()
        AND is_exec_board = true
    )
  );
$$;
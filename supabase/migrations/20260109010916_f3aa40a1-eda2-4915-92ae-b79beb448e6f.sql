-- Drop the conflicting older policies that don't include exec board
DROP POLICY IF EXISTS "events_delete_auth" ON public.gw_events;
DROP POLICY IF EXISTS "events_update_auth" ON public.gw_events;
DROP POLICY IF EXISTS "events_insert_auth" ON public.gw_events;
DROP POLICY IF EXISTS "events_select_public" ON public.gw_events;

-- The "Admins and exec board can manage all events" policy already handles ALL operations
-- It includes exec board members via gw_executive_board_members table check

-- Also update check_user_admin_simple to include exec board for any other usage
CREATE OR REPLACE FUNCTION check_user_admin_simple()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(
      (SELECT is_admin OR is_super_admin FROM gw_profiles WHERE user_id = auth.uid() LIMIT 1),
      false
    )
    OR
    EXISTS (
      SELECT 1 FROM gw_executive_board_members 
      WHERE user_id = auth.uid() AND is_active = true
    );
$$;
-- Drop the problematic policy that's causing infinite recursion
DROP POLICY IF EXISTS "gw_profiles_exec_board_view_all" ON public.gw_profiles;
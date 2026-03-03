
-- Create a helper function to check if user is exec board
CREATE OR REPLACE FUNCTION public.is_exec_board_member(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = check_user_id
    AND is_exec_board = true
  );
$$;

-- Update gw_communication_system: allow EC board to view all communications
DROP POLICY IF EXISTS "Users can view communications sent to them" ON public.gw_communication_system;
CREATE POLICY "Users can view communications sent to them"
ON public.gw_communication_system FOR SELECT
USING (
  auth.uid() = sender_id
  OR is_gw_admin_v2()
  OR is_exec_board_member(auth.uid())
  OR EXISTS (
    SELECT 1 FROM gw_communication_recipients gcr
    WHERE gcr.communication_id = gw_communication_system.id
    AND (gcr.recipient_identifier = auth.uid()::text OR gcr.recipient_type = 'all_members')
  )
);

-- Allow EC board to create communications (already allowed by sender_id = auth.uid(), no change needed)

-- Update gw_message_groups: allow EC board to create groups
DROP POLICY IF EXISTS "Admins can create message groups" ON public.gw_message_groups;
CREATE POLICY "Admins and exec board can create message groups"
ON public.gw_message_groups FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  )
);

-- Update gw_message_groups: allow EC board to manage groups
DROP POLICY IF EXISTS "Admins can manage message groups" ON public.gw_message_groups;
CREATE POLICY "Admins and exec board can manage message groups"
ON public.gw_message_groups FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true OR gp.is_exec_board = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true OR gp.is_exec_board = true)
  )
);

-- Update simple_admin_all_groups to include exec board
DROP POLICY IF EXISTS "simple_admin_all_groups" ON public.gw_message_groups;
CREATE POLICY "simple_admin_all_groups"
ON public.gw_message_groups FOR ALL
USING (
  auth.uid() IN (
    SELECT gw_profiles.user_id FROM gw_profiles
    WHERE gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true
  )
);

-- Update gw_group_members: allow EC board to insert members
DROP POLICY IF EXISTS "Admins can insert group members" ON public.gw_group_members;
CREATE POLICY "Admins and exec board can insert group members"
ON public.gw_group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true)
  )
);

-- Update gw_group_members: allow EC board to manage memberships
DROP POLICY IF EXISTS "Admins can manage group memberships" ON public.gw_group_members;
CREATE POLICY "Admins and exec board can manage group memberships"
ON public.gw_group_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true OR gp.is_exec_board = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true OR gp.is_exec_board = true)
  )
);

-- Update simple_admin_all_memberships to include exec board
DROP POLICY IF EXISTS "simple_admin_all_memberships" ON public.gw_group_members;
CREATE POLICY "simple_admin_all_memberships"
ON public.gw_group_members FOR ALL
USING (
  auth.uid() IN (
    SELECT gw_profiles.user_id FROM gw_profiles
    WHERE gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true OR gw_profiles.is_exec_board = true
  )
);

-- Ensure proper RLS policies for MUS240 group editing
-- First, check and fix the policies for mus240_project_groups

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "mus240_project_groups_select" ON mus240_project_groups;
DROP POLICY IF EXISTS "mus240_project_groups_insert" ON mus240_project_groups;
DROP POLICY IF EXISTS "mus240_project_groups_update" ON mus240_project_groups;
DROP POLICY IF EXISTS "mus240_project_groups_delete" ON mus240_project_groups;

-- Create permissive policies for students to work collaboratively
CREATE POLICY "Everyone can view mus240 groups" ON mus240_project_groups
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create mus240 groups" ON mus240_project_groups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Group members can edit their groups" ON mus240_project_groups
  FOR UPDATE USING (
    -- Admins can edit all groups
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
    OR
    -- Group members can edit their own groups
    EXISTS (
      SELECT 1 FROM mus240_group_memberships 
      WHERE group_id = mus240_project_groups.id 
      AND member_id = auth.uid()
    )
    OR
    -- Anyone can edit groups with no members yet
    NOT EXISTS (
      SELECT 1 FROM mus240_group_memberships 
      WHERE group_id = mus240_project_groups.id
    )
  );

CREATE POLICY "Admins can delete mus240 groups" ON mus240_project_groups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Ensure mus240_group_memberships policies are permissive
DROP POLICY IF EXISTS "mus240_group_memberships_select" ON mus240_group_memberships;
DROP POLICY IF EXISTS "mus240_group_memberships_insert" ON mus240_group_memberships;
DROP POLICY IF EXISTS "mus240_group_memberships_update" ON mus240_group_memberships;
DROP POLICY IF EXISTS "mus240_group_memberships_delete" ON mus240_group_memberships;

CREATE POLICY "Everyone can view group memberships" ON mus240_group_memberships
  FOR SELECT USING (true);

CREATE POLICY "Students can join groups" ON mus240_group_memberships
  FOR INSERT WITH CHECK (auth.uid() = member_id OR check_user_admin_simple());

CREATE POLICY "Members can update their memberships" ON mus240_group_memberships
  FOR UPDATE USING (
    auth.uid() = member_id 
    OR check_user_admin_simple()
    OR EXISTS (
      SELECT 1 FROM mus240_group_memberships gm2
      WHERE gm2.group_id = mus240_group_memberships.group_id 
      AND gm2.member_id = auth.uid()
      AND gm2.role = 'leader'
    )
  );

CREATE POLICY "Members can leave groups" ON mus240_group_memberships
  FOR DELETE USING (
    auth.uid() = member_id 
    OR check_user_admin_simple()
  );
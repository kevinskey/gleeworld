-- Remove ALL old recursive policies that are causing infinite recursion

-- Drop ALL policies on gw_group_members
DROP POLICY IF EXISTS "Group admins can manage memberships" ON public.gw_group_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.gw_group_members;
DROP POLICY IF EXISTS "Users can view group memberships for groups they belong to" ON public.gw_group_members;

-- Drop ALL policies on gw_message_groups  
DROP POLICY IF EXISTS "Admins and executives can create groups" ON public.gw_message_groups;
DROP POLICY IF EXISTS "Group admins can update groups" ON public.gw_message_groups;

-- The simple policies should remain:
-- "simple_view_own_membership" and "simple_admin_all_memberships" on gw_group_members
-- "simple_view_all_groups" and "simple_admin_all_groups" on gw_message_groups
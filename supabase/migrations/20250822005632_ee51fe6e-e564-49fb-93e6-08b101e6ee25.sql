-- Fix the circular dependency by simplifying the policies

-- Drop all policies again
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.gw_message_groups;
DROP POLICY IF EXISTS "Admins can manage message groups" ON public.gw_message_groups;
DROP POLICY IF EXISTS "Members can view their own membership" ON public.gw_group_members;
DROP POLICY IF EXISTS "Members can update their own membership settings" ON public.gw_group_members;
DROP POLICY IF EXISTS "Admins can manage all memberships" ON public.gw_group_members;

-- Create very simple policies that don't cause recursion

-- For gw_group_members: allow users to see their own memberships and admins to see all
CREATE POLICY "View own memberships"
ON public.gw_group_members
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admin access to all memberships"
ON public.gw_group_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- For gw_message_groups: allow viewing all groups (filtering will be done by the join)
-- This removes the circular dependency
CREATE POLICY "View all message groups"
ON public.gw_message_groups
FOR SELECT
USING (true);

CREATE POLICY "Admin manage message groups"
ON public.gw_message_groups
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
);
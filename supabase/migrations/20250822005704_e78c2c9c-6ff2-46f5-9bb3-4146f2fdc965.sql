-- Completely disable RLS and recreate with ultra-simple policies

-- Disable RLS completely
ALTER TABLE public.gw_group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_message_groups DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "View own memberships" ON public.gw_group_members;
DROP POLICY IF EXISTS "Admin access to all memberships" ON public.gw_group_members;
DROP POLICY IF EXISTS "View all message groups" ON public.gw_message_groups;
DROP POLICY IF EXISTS "Admin manage message groups" ON public.gw_message_groups;

-- Re-enable RLS
ALTER TABLE public.gw_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_message_groups ENABLE ROW LEVEL SECURITY;

-- Create ultra-simple policies without ANY cross-table references

-- For gw_group_members: only allow viewing own memberships
CREATE POLICY "simple_view_own_membership"
ON public.gw_group_members
FOR SELECT
USING (user_id = auth.uid());

-- For gw_message_groups: allow viewing all (security handled by the join in the query)
CREATE POLICY "simple_view_all_groups"
ON public.gw_message_groups
FOR SELECT
USING (true);

-- Admin policies using only gw_profiles table (no circular reference)
CREATE POLICY "simple_admin_all_memberships"
ON public.gw_group_members
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM public.gw_profiles 
    WHERE is_admin = true OR is_super_admin = true
  )
);

CREATE POLICY "simple_admin_all_groups"
ON public.gw_message_groups
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM public.gw_profiles 
    WHERE is_admin = true OR is_super_admin = true
  )
);
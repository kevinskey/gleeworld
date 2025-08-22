-- Fix infinite recursion by completely rewriting the policies with simple, non-recursive logic

-- Drop ALL existing policies on both tables
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.gw_message_groups;
DROP POLICY IF EXISTS "Admins can manage all message groups" ON public.gw_message_groups;
DROP POLICY IF EXISTS "Users can view their own group memberships" ON public.gw_group_members;
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON public.gw_group_members;
DROP POLICY IF EXISTS "Users can update their own group settings" ON public.gw_group_members;
DROP POLICY IF EXISTS "Admins can manage all group members" ON public.gw_group_members;

-- Create simple, non-recursive policies for gw_group_members first
CREATE POLICY "Members can view their own membership"
ON public.gw_group_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Members can update their own membership settings"
ON public.gw_group_members
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all memberships"
ON public.gw_group_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- Now create policies for gw_message_groups that don't cause recursion
CREATE POLICY "Users can view groups they belong to"
ON public.gw_message_groups
FOR SELECT
USING (
  -- Direct membership check without recursion
  id IN (
    SELECT gm.group_id 
    FROM public.gw_group_members gm 
    WHERE gm.user_id = auth.uid()
  )
  OR 
  -- Admin access
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

CREATE POLICY "Admins can manage message groups"
ON public.gw_message_groups
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
);
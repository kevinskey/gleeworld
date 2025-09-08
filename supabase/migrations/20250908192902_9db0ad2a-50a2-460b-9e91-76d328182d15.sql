-- Fix RLS policies for MUS240 group deletion

-- Allow group leaders and admins to delete groups
DROP POLICY IF EXISTS "mus240_project_groups_delete" ON public.mus240_project_groups;

CREATE POLICY "mus240_project_groups_delete" 
ON public.mus240_project_groups 
FOR DELETE 
USING (
  -- Group leader can delete their own group
  leader_id = auth.uid() OR
  -- Admins can delete any group
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Also ensure group memberships can be deleted when groups are deleted
DROP POLICY IF EXISTS "mus240_group_memberships_delete" ON public.mus240_group_memberships;

CREATE POLICY "mus240_group_memberships_delete" 
ON public.mus240_group_memberships 
FOR DELETE 
USING (
  -- Group members can leave their group
  member_id = auth.uid() OR
  -- Group leaders can remove members from their group
  EXISTS (
    SELECT 1 FROM public.mus240_project_groups 
    WHERE id = mus240_group_memberships.group_id 
    AND leader_id = auth.uid()
  ) OR
  -- Admins can manage all memberships
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);
-- Fix RLS policies for MUS240 project groups to allow creation
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can manage their own groups" ON public.mus240_project_groups;
DROP POLICY IF EXISTS "Students can view all groups" ON public.mus240_project_groups;

-- Create comprehensive policies for MUS240 project groups
CREATE POLICY "Students can view all groups"
ON public.mus240_project_groups
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Students can create groups"
ON public.mus240_project_groups
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Students can update groups they lead or are members of"
ON public.mus240_project_groups
FOR UPDATE
TO authenticated
USING (
  leader_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.mus240_group_memberships
    WHERE group_id = mus240_project_groups.id 
    AND member_id = auth.uid()
  )
);

CREATE POLICY "Students can delete groups they lead"
ON public.mus240_project_groups
FOR DELETE
TO authenticated
USING (leader_id = auth.uid());

-- Fix RLS policies for MUS240 group memberships
DROP POLICY IF EXISTS "Students can manage group memberships" ON public.mus240_group_memberships;

CREATE POLICY "Students can view all group memberships"
ON public.mus240_group_memberships
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Students can join groups"
ON public.mus240_group_memberships
FOR INSERT
TO authenticated
WITH CHECK (member_id = auth.uid());

CREATE POLICY "Students can leave groups or leaders can manage memberships"
ON public.mus240_group_memberships
FOR DELETE
TO authenticated
USING (
  member_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.mus240_project_groups
    WHERE id = mus240_group_memberships.group_id 
    AND leader_id = auth.uid()
  )
);

CREATE POLICY "Leaders can update member roles"
ON public.mus240_group_memberships
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mus240_project_groups
    WHERE id = mus240_group_memberships.group_id 
    AND leader_id = auth.uid()
  )
);
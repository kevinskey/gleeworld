-- Fix RLS policies for MUS240 project groups to allow admin creation

-- Ensure insert policy exists for admins and group leaders
DROP POLICY IF EXISTS "mus240_project_groups_insert" ON public.mus240_project_groups;

CREATE POLICY "mus240_project_groups_insert" 
ON public.mus240_project_groups 
FOR INSERT 
WITH CHECK (
  -- Admins can create any group
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR
  -- Users can create their own groups (where they are the leader)
  leader_id = auth.uid()
);

-- Ensure select policy exists
DROP POLICY IF EXISTS "mus240_project_groups_select" ON public.mus240_project_groups;

CREATE POLICY "mus240_project_groups_select" 
ON public.mus240_project_groups 
FOR SELECT 
USING (true); -- Anyone can view groups

-- Ensure update policy exists for admins and leaders
DROP POLICY IF EXISTS "mus240_project_groups_update" ON public.mus240_project_groups;

CREATE POLICY "mus240_project_groups_update" 
ON public.mus240_project_groups 
FOR UPDATE 
USING (
  -- Admins can update any group
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR
  -- Group leaders can update their own groups
  leader_id = auth.uid()
);
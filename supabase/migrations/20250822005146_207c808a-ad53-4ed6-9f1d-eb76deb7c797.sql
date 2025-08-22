-- Drop ALL existing policies on both tables to start fresh
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.gw_message_groups;
DROP POLICY IF EXISTS "Admins can manage all message groups" ON public.gw_message_groups;
DROP POLICY IF EXISTS "Users can view their own group memberships" ON public.gw_group_members;
DROP POLICY IF EXISTS "Users can view members of groups they belong to" ON public.gw_group_members;
DROP POLICY IF EXISTS "Users can update their own group settings" ON public.gw_group_members;
DROP POLICY IF EXISTS "Admins can manage all group members" ON public.gw_group_members;

-- Create security definer functions to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.user_is_group_member(group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_group_members gm
    WHERE gm.group_id = $1 
    AND gm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  );
$$;

-- Create new non-recursive policies for gw_group_members
CREATE POLICY "Users can view their own group memberships"
ON public.gw_group_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view members of groups they belong to"
ON public.gw_group_members
FOR SELECT  
USING (user_is_group_member(group_id) OR user_is_admin());

CREATE POLICY "Users can update their own group settings"
ON public.gw_group_members
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all group members"
ON public.gw_group_members
FOR ALL
USING (user_is_admin());

-- Create policies for gw_message_groups
CREATE POLICY "Users can view groups they are members of"
ON public.gw_message_groups
FOR SELECT
USING (user_is_group_member(id) OR user_is_admin());

CREATE POLICY "Admins can manage all message groups"
ON public.gw_message_groups
FOR ALL
USING (user_is_admin());
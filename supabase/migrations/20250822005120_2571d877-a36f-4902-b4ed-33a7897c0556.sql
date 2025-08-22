-- Fix infinite recursion in gw_group_members policies
-- First, create security definer functions to avoid recursive RLS

CREATE OR REPLACE FUNCTION public.user_can_access_group_member(member_user_id uuid, group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_group_members gm
    WHERE gm.user_id = member_user_id 
    AND gm.group_id = group_id
    AND gm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  );
$$;

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view their own group memberships" ON public.gw_group_members;
DROP POLICY IF EXISTS "Members can update their own group settings" ON public.gw_group_members;
DROP POLICY IF EXISTS "Admins can manage all group members" ON public.gw_group_members;
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON public.gw_group_members;

-- Create new non-recursive policies
CREATE POLICY "Users can view their own group memberships"
ON public.gw_group_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view members of groups they belong to"
ON public.gw_group_members
FOR SELECT  
USING (user_is_group_member(group_id));

CREATE POLICY "Users can update their own group settings"
ON public.gw_group_members
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all group members"
ON public.gw_group_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- Also create the message groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.gw_message_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  group_type text NOT NULL DEFAULT 'general',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on message groups
ALTER TABLE public.gw_message_groups ENABLE ROW LEVEL SECURITY;

-- Create message groups policies
CREATE POLICY "Users can view groups they are members of"
ON public.gw_message_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_group_members gm
    WHERE gm.group_id = gw_message_groups.id 
    AND gm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

CREATE POLICY "Admins can manage all message groups"
ON public.gw_message_groups
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true)
  )
);

-- Create the group members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.gw_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.gw_message_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone,
  is_muted boolean DEFAULT false,
  UNIQUE(group_id, user_id)
);

-- Enable RLS on group members (if not already enabled)
ALTER TABLE public.gw_group_members ENABLE ROW LEVEL SECURITY;

-- Add update trigger for message groups
CREATE OR REPLACE FUNCTION public.update_gw_message_groups_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_gw_message_groups_updated_at ON public.gw_message_groups;
CREATE TRIGGER update_gw_message_groups_updated_at
  BEFORE UPDATE ON public.gw_message_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_message_groups_updated_at();
-- Fix infinite recursion in event_class_lists and event_class_list_members policies

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view class lists they're part of" ON public.event_class_lists;
DROP POLICY IF EXISTS "Event creators can manage class list members" ON public.event_class_list_members;
DROP POLICY IF EXISTS "Users can view their own class list memberships" ON public.event_class_list_members;

-- Create security definer functions to break recursion
CREATE OR REPLACE FUNCTION public.user_can_view_class_list(class_list_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_class_list_members eclm
    WHERE eclm.class_list_id = class_list_id_param 
    AND eclm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_class_list_members(class_list_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_class_lists ecl
    JOIN events e ON e.id = ecl.event_id
    WHERE ecl.id = class_list_id_param 
    AND e.created_by = auth.uid()
  );
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view class lists they're part of"
ON public.event_class_lists
FOR SELECT
TO authenticated
USING (public.user_can_view_class_list(id));

CREATE POLICY "Event creators can manage class list members"
ON public.event_class_list_members
FOR ALL
TO authenticated
USING (public.user_can_manage_class_list_members(class_list_id));

CREATE POLICY "Users can view their own class list memberships"
ON public.event_class_list_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
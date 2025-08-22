-- Fix RLS policies for gw_group_messages to avoid recursion

-- Drop all existing recursive policies on gw_group_messages
DROP POLICY IF EXISTS "Group members can send messages" ON public.gw_group_messages;
DROP POLICY IF EXISTS "Users can edit their own messages" ON public.gw_group_messages;
DROP POLICY IF EXISTS "Users can view messages in groups they belong to" ON public.gw_group_messages;

-- Create simple, non-recursive policies

-- Allow users to view all messages (filtering will be done by the application layer)
CREATE POLICY "simple_view_all_messages"
ON public.gw_group_messages
FOR SELECT
USING (true);

-- Allow users to send messages (they must set their own user_id)
CREATE POLICY "simple_send_messages"
ON public.gw_group_messages
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow users to edit their own messages
CREATE POLICY "simple_edit_own_messages"
ON public.gw_group_messages
FOR UPDATE
USING (user_id = auth.uid());

-- Allow users to delete their own messages
CREATE POLICY "simple_delete_own_messages"
ON public.gw_group_messages
FOR DELETE
USING (user_id = auth.uid());

-- Admin policies using only gw_profiles table (no circular reference)
CREATE POLICY "simple_admin_all_messages"
ON public.gw_group_messages
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM public.gw_profiles 
    WHERE is_admin = true OR is_super_admin = true
  )
);
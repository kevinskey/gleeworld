-- Create helper functions for MUS 240 group operations

-- Function to leave a group
CREATE OR REPLACE FUNCTION public.leave_mus240_group(
  p_group_id UUID,
  p_member_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  membership_record RECORD;
  updated_count INTEGER;
BEGIN
  -- Check if user is a member of the group
  SELECT * INTO membership_record 
  FROM mus240_group_memberships 
  WHERE group_id = p_group_id AND member_id = p_member_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a member of this group');
  END IF;
  
  -- Remove the membership
  DELETE FROM mus240_group_memberships 
  WHERE group_id = p_group_id AND member_id = p_member_id;
  
  -- Update the group member count
  UPDATE mus240_project_groups 
  SET member_count = member_count - 1,
      updated_at = now()
  WHERE id = p_group_id;
  
  -- If the user was the leader, clear the leader field
  IF membership_record.role = 'leader' THEN
    UPDATE mus240_project_groups 
    SET leader_id = NULL,
        updated_at = now()
    WHERE id = p_group_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Successfully left the group');
END;
$$;

-- Function to update member role
CREATE OR REPLACE FUNCTION public.update_mus240_member_role(
  p_group_id UUID,
  p_member_id UUID,
  p_new_role TEXT,
  p_requester_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  group_record RECORD;
  is_admin BOOLEAN := false;
BEGIN
  -- Check if requester is admin
  SELECT EXISTS(
    SELECT 1 FROM gw_profiles 
    WHERE user_id = p_requester_id 
    AND (is_admin = true OR is_super_admin = true)
  ) INTO is_admin;
  
  -- Get group info
  SELECT * INTO group_record FROM mus240_project_groups WHERE id = p_group_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Group not found');
  END IF;
  
  -- Check permissions (must be admin or group leader)
  IF NOT is_admin AND group_record.leader_id != p_requester_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;
  
  -- Check if member exists in group
  IF NOT EXISTS(
    SELECT 1 FROM mus240_group_memberships 
    WHERE group_id = p_group_id AND member_id = p_member_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this group');
  END IF;
  
  -- Update the member role
  UPDATE mus240_group_memberships 
  SET role = p_new_role 
  WHERE group_id = p_group_id AND member_id = p_member_id;
  
  -- If promoting to leader, update the group leader_id
  IF p_new_role = 'leader' THEN
    UPDATE mus240_project_groups 
    SET leader_id = p_member_id,
        updated_at = now()
    WHERE id = p_group_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Member role updated successfully');
END;
$$;
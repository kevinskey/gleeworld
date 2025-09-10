-- Add a function to safely leave a group
CREATE OR REPLACE FUNCTION public.leave_mus240_group(
  p_group_id uuid,
  p_member_id uuid
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_record RECORD;
  remaining_members INTEGER;
  new_leader_id uuid;
  result jsonb;
BEGIN
  -- Check if user is actually in the group
  SELECT * INTO membership_record
  FROM mus240_group_memberships
  WHERE group_id = p_group_id AND member_id = p_member_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are not a member of this group');
  END IF;
  
  -- Remove the membership
  DELETE FROM mus240_group_memberships
  WHERE group_id = p_group_id AND member_id = p_member_id;
  
  -- Count remaining members
  SELECT COUNT(*) INTO remaining_members
  FROM mus240_group_memberships
  WHERE group_id = p_group_id;
  
  -- If the leaving member was the leader and there are other members, assign a new leader
  IF membership_record.role = 'leader' AND remaining_members > 0 THEN
    -- Get the next member to be leader (oldest by join date)
    SELECT member_id INTO new_leader_id
    FROM mus240_group_memberships
    WHERE group_id = p_group_id
    ORDER BY joined_at ASC
    LIMIT 1;
    
    -- Update their role to leader
    UPDATE mus240_group_memberships
    SET role = 'leader'
    WHERE group_id = p_group_id AND member_id = new_leader_id;
    
    -- Update group leader_id
    UPDATE mus240_project_groups
    SET leader_id = new_leader_id, member_count = remaining_members
    WHERE id = p_group_id;
  ELSE
    -- Just update member count
    UPDATE mus240_project_groups
    SET member_count = remaining_members,
        leader_id = CASE WHEN remaining_members = 0 THEN NULL ELSE leader_id END
    WHERE id = p_group_id;
  END IF;
  
  -- If no members left, mark group as inactive
  IF remaining_members = 0 THEN
    UPDATE mus240_project_groups
    SET is_official = false
    WHERE id = p_group_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Successfully left the group',
    'remaining_members', remaining_members,
    'new_leader_id', new_leader_id
  );
END;
$$;

-- Add a function to change member roles (for group leaders)
CREATE OR REPLACE FUNCTION public.update_mus240_member_role(
  p_group_id uuid,
  p_member_id uuid,
  p_new_role text,
  p_requester_id uuid
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role text;
  current_leader_id uuid;
  result jsonb;
BEGIN
  -- Check if requester is the group leader or admin
  SELECT role INTO requester_role
  FROM mus240_group_memberships
  WHERE group_id = p_group_id AND member_id = p_requester_id;
  
  IF requester_role != 'leader' AND NOT EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = p_requester_id AND (is_admin = true OR is_super_admin = true)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only group leaders can change member roles');
  END IF;
  
  -- If promoting someone to leader, demote current leader to member
  IF p_new_role = 'leader' THEN
    -- Get current leader
    SELECT leader_id INTO current_leader_id
    FROM mus240_project_groups
    WHERE id = p_group_id;
    
    -- Demote current leader to member (if different from the new leader)
    IF current_leader_id IS NOT NULL AND current_leader_id != p_member_id THEN
      UPDATE mus240_group_memberships
      SET role = 'member'
      WHERE group_id = p_group_id AND member_id = current_leader_id;
    END IF;
    
    -- Update group leader_id
    UPDATE mus240_project_groups
    SET leader_id = p_member_id
    WHERE id = p_group_id;
  END IF;
  
  -- Update the member's role
  UPDATE mus240_group_memberships
  SET role = p_new_role
  WHERE group_id = p_group_id AND member_id = p_member_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found in group');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Member role updated successfully'
  );
END;
$$;
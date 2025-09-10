-- Fix the leave_mus240_group function to handle the case where leader leaves and no members remain
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
    
    -- Update group leader_id and member count
    UPDATE mus240_project_groups
    SET leader_id = new_leader_id, 
        member_count = remaining_members,
        is_official = CASE WHEN remaining_members >= 3 THEN true ELSE false END
    WHERE id = p_group_id;
  ELSIF remaining_members = 0 THEN
    -- If no members left, delete the group entirely
    DELETE FROM mus240_project_groups
    WHERE id = p_group_id;
  ELSE
    -- Just update member count (non-leader leaving)
    UPDATE mus240_project_groups
    SET member_count = remaining_members,
        is_official = CASE WHEN remaining_members >= 3 THEN true ELSE false END
    WHERE id = p_group_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Successfully left the group',
    'remaining_members', remaining_members,
    'new_leader_id', new_leader_id,
    'group_deleted', remaining_members = 0
  );
END;
$$;
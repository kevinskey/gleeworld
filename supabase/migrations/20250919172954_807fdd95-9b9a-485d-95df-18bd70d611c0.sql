-- Create the missing leave_mus240_group function with proper column qualification
CREATE OR REPLACE FUNCTION public.leave_mus240_group(
  p_group_id UUID,
  p_member_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_record RECORD;
  group_record RECORD;
  result jsonb;
BEGIN
  -- Get the membership record
  SELECT id, role INTO membership_record
  FROM mus240_group_memberships
  WHERE group_id = p_group_id AND member_id = p_member_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are not a member of this group'
    );
  END IF;
  
  -- Get group info
  SELECT name, member_count INTO group_record
  FROM mus240_project_groups
  WHERE id = p_group_id;
  
  -- Delete the membership
  DELETE FROM mus240_group_memberships
  WHERE group_id = p_group_id AND member_id = p_member_id;
  
  -- Update group member count
  UPDATE mus240_project_groups
  SET 
    member_count = member_count - 1,
    updated_at = now()
  WHERE id = p_group_id;
  
  -- If the leaving member was a leader and there are other members, promote someone
  IF membership_record.role = 'leader' THEN
    UPDATE mus240_group_memberships
    SET role = 'leader'
    WHERE group_id = p_group_id
    AND id = (
      SELECT id FROM mus240_group_memberships
      WHERE group_id = p_group_id
      ORDER BY joined_at ASC
      LIMIT 1
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully left the group'
  );
END;
$$;
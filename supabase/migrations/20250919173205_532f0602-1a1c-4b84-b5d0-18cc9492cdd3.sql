-- Create the missing update_mus240_member_role function
CREATE OR REPLACE FUNCTION public.update_mus240_member_role(
  p_group_id UUID,
  p_member_id UUID,
  p_new_role TEXT,
  p_requester_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_membership RECORD;
  target_membership RECORD;
  group_record RECORD;
BEGIN
  -- Get group info
  SELECT name INTO group_record
  FROM mus240_project_groups
  WHERE id = p_group_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Group not found'
    );
  END IF;
  
  -- Get requester's membership
  SELECT role INTO requester_membership
  FROM mus240_group_memberships
  WHERE group_id = p_group_id AND member_id = p_requester_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are not a member of this group'
    );
  END IF;
  
  -- Check if requester has permission (must be leader or admin)
  IF requester_membership.role != 'leader' AND NOT is_current_user_admin_safe() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only group leaders can update member roles'
    );
  END IF;
  
  -- Get target member's current membership
  SELECT role INTO target_membership
  FROM mus240_group_memberships
  WHERE group_id = p_group_id AND member_id = p_member_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Target member not found in group'
    );
  END IF;
  
  -- Validate role change
  IF p_new_role NOT IN ('member', 'leader') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid role. Must be either "member" or "leader"'
    );
  END IF;
  
  -- Update the member's role
  UPDATE mus240_group_memberships
  SET 
    role = p_new_role,
    updated_at = now()
  WHERE group_id = p_group_id AND member_id = p_member_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Member role updated successfully'
  );
END;
$$;

-- Create the missing is_mus240_student function that was referenced in RLS policies
CREATE OR REPLACE FUNCTION public.is_mus240_student(user_id_param UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = user_id_param 
    AND (
      role = 'student' OR 
      is_admin = true OR 
      is_super_admin = true OR
      role IN ('admin', 'super-admin')
    )
  );
$$;
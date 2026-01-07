-- Add course_id column to messenger_groups for course-linked messaging
ALTER TABLE public.messenger_groups ADD COLUMN IF NOT EXISTS course_id uuid;

-- Create index for efficient course filtering
CREATE INDEX IF NOT EXISTS idx_messenger_groups_course ON public.messenger_groups(course_id);

-- Create function to sync course enrollments to messenger group
CREATE OR REPLACE FUNCTION public.sync_course_messenger_group(p_course_id uuid, p_course_code text, p_course_title text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_enrollment RECORD;
BEGIN
  -- Check if a messenger group already exists for this course
  SELECT id INTO v_group_id
  FROM messenger_groups
  WHERE course_id = p_course_id
  LIMIT 1;
  
  -- Create the group if it doesn't exist
  IF v_group_id IS NULL THEN
    INSERT INTO messenger_groups (id, name, description, is_active, course_id, member_count)
    VALUES (
      gen_random_uuid(),
      p_course_code || ' - ' || p_course_title,
      'Course messaging group for ' || p_course_title,
      true,
      p_course_id,
      0
    )
    RETURNING id INTO v_group_id;
  END IF;
  
  -- Sync all enrolled students to the group
  FOR v_enrollment IN 
    SELECT user_id 
    FROM gw_course_enrollments 
    WHERE course_id = p_course_id::text
    AND enrollment_status = 'enrolled'
  LOOP
    -- Insert if not already a member
    INSERT INTO messenger_group_members (group_id, user_id, role, joined_at)
    VALUES (v_group_id, v_enrollment.user_id, 'member', NOW())
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END LOOP;
  
  -- Update member count
  UPDATE messenger_groups
  SET member_count = (
    SELECT COUNT(*) FROM messenger_group_members WHERE group_id = v_group_id
  ),
  updated_at = NOW()
  WHERE id = v_group_id;
  
  RETURN v_group_id;
END;
$$;

-- Add unique constraint to prevent duplicate members
ALTER TABLE public.messenger_group_members 
  DROP CONSTRAINT IF EXISTS messenger_group_members_unique_member;
ALTER TABLE public.messenger_group_members 
  ADD CONSTRAINT messenger_group_members_unique_member UNIQUE (group_id, user_id);
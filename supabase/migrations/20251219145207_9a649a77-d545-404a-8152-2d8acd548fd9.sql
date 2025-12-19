-- Fix the sync function to exclude null user_ids
CREATE OR REPLACE FUNCTION public.sync_all_messenger_groups()
RETURNS void AS $$
DECLARE
  group_record RECORD;
  current_academic_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- If we're past August, academic year is current+4 for freshmen
  IF EXTRACT(MONTH FROM CURRENT_DATE) >= 8 THEN
    current_academic_year := current_academic_year + 4;
  ELSE
    current_academic_year := current_academic_year + 3;
  END IF;

  -- Sync All Members group
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'All Members' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND (p.role = 'member' OR p.is_super_admin = true)
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync S1
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Soprano 1' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.voice_part = 'S1'
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync S2
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Soprano 2' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.voice_part = 'S2'
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync A1
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Alto 1' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.voice_part = 'A1'
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync A2
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Alto 2' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.voice_part = 'A2'
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync Musical Leadership
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Musical Leadership' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND (p.is_section_leader = true 
           OR p.exec_board_role ILIKE '%section%leader%'
           OR p.exec_board_role = 'student_conductor'
           OR p.is_admin = true)
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync Setup Crew (First-year members)
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Setup Crew' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.class_year = current_academic_year AND p.role = 'member'
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync First-Years (2029)
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'First-Years' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.class_year = 2029
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync Sophomores (2028)
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Sophomores' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.class_year = 2028
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync Juniors (2027)
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Juniors' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.class_year = 2027
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync Seniors (2026)
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Seniors' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.class_year = 2026
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync Alumnae
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Alumnae' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.role = 'alumna'
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync Fans
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Fans' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.role = 'fan'
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Sync Mentors
  FOR group_record IN SELECT id FROM public.messenger_groups WHERE name = 'Mentors' LOOP
    INSERT INTO public.messenger_group_members (group_id, user_id, role)
    SELECT group_record.id, p.user_id, 'member'
    FROM public.gw_profiles p
    WHERE p.user_id IS NOT NULL AND p.is_mentor = true
      AND NOT EXISTS (SELECT 1 FROM public.messenger_group_members m WHERE m.group_id = group_record.id AND m.user_id = p.user_id);
  END LOOP;

  -- Update all member counts
  UPDATE public.messenger_groups g
  SET member_count = (SELECT COUNT(*) FROM public.messenger_group_members m WHERE m.group_id = g.id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Run the sync now
SELECT public.sync_all_messenger_groups();
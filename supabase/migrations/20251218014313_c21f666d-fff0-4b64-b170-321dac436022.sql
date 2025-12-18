-- Grant Aliyah Deere tour manager permissions
-- First, get her user_id from gw_profiles by email
DO $$
DECLARE
  aliyah_user_id UUID;
  onnesty_user_id UUID;
BEGIN
  -- Get Aliyah's user_id
  SELECT user_id INTO aliyah_user_id FROM public.gw_profiles WHERE email ILIKE '%aliyahdeere%' OR email ILIKE '%aaliyahdeere%' LIMIT 1;
  
  -- Get Onnesty's user_id
  SELECT user_id INTO onnesty_user_id FROM public.gw_profiles WHERE email ILIKE '%onnestypeele%' LIMIT 1;
  
  -- Update Aliyah's profile to have exec board permissions if found
  IF aliyah_user_id IS NOT NULL THEN
    UPDATE public.gw_profiles 
    SET is_exec_board = true, exec_board_role = 'tour_manager'
    WHERE user_id = aliyah_user_id;
  END IF;
  
  -- Ensure Onnesty has tour manager role set
  IF onnesty_user_id IS NOT NULL THEN
    UPDATE public.gw_profiles 
    SET is_exec_board = true, exec_board_role = 'tour_manager'
    WHERE user_id = onnesty_user_id AND (exec_board_role IS NULL OR exec_board_role = '');
  END IF;
END $$;

-- Grant tour-management module permission to both users via username_permissions
INSERT INTO public.username_permissions (user_email, module_name, is_active, notes)
VALUES 
  ('onnestypeele@spelman.edu', 'tour-management', true, 'Tour Manager - granted full tour management access'),
  ('aliyahdeere@spelman.edu', 'tour-management', true, 'Tour Manager - granted full tour management access')
ON CONFLICT (user_email, module_name) DO UPDATE SET is_active = true, notes = 'Tour Manager - granted full tour management access';
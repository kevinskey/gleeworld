-- Set up onnestypeele@spelman.edu as Tour Manager executive board member

-- Update the user's profile to have executive board access
UPDATE public.gw_profiles 
SET 
  exec_board_role = 'tour_manager',
  is_exec_board = true,
  verified = true,
  role = 'executive',
  updated_at = now()
WHERE email = 'onnestypeele@spelman.edu';

-- If the profile doesn't exist, insert it (this should not normally happen but as a safety measure)
INSERT INTO public.gw_profiles (
  email, 
  full_name, 
  exec_board_role, 
  is_exec_board, 
  verified, 
  role,
  created_at,
  updated_at
) 
SELECT 
  'onnestypeele@spelman.edu',
  'Onnesty Peele',
  'tour_manager',
  true,
  true,
  'executive',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_profiles WHERE email = 'onnestypeele@spelman.edu'
);

-- Enable the tours and logistics modules for this user by default
INSERT INTO public.gw_executive_module_preferences (
  user_id,
  module_id,
  is_enabled,
  created_at,
  updated_at
)
SELECT 
  gp.user_id,
  unnest(ARRAY['tours-logistics', 'concert-management', 'task-manager', 'communications', 'executive-calendar']),
  true,
  now(),
  now()
FROM public.gw_profiles gp 
WHERE gp.email = 'onnestypeele@spelman.edu'
ON CONFLICT (user_id, module_id) 
DO UPDATE SET 
  is_enabled = true,
  updated_at = now();
-- Update onnestypeele@spelman.edu to have proper tour manager access
UPDATE public.gw_profiles 
SET 
  role = 'member',
  verified = true,
  updated_at = NOW()
WHERE email = 'onnestypeele@spelman.edu';

-- Ensure they have the correct executive board entry (should already exist but let's make sure)
INSERT INTO public.gw_executive_board_members (user_id, position, is_active)
SELECT 
  user_id,
  'tour_manager'::executive_position,
  true
FROM public.gw_profiles 
WHERE email = 'onnestypeele@spelman.edu'
ON CONFLICT (user_id, position) 
DO UPDATE SET 
  is_active = true;
-- Verify all executive board members to give them proper access
UPDATE public.gw_profiles 
SET 
  verified = true,
  role = 'member',  -- Upgrade from 'fan' to 'member' for proper access
  updated_at = NOW()
WHERE user_id IN (
  SELECT user_id 
  FROM public.gw_executive_board_members 
  WHERE is_active = true
) AND verified = false;
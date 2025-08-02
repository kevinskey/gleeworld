-- Verify all executive board members (only update verified status to avoid privilege escalation trigger)
UPDATE public.gw_profiles 
SET 
  verified = true,
  updated_at = NOW()
WHERE user_id IN (
  SELECT user_id 
  FROM public.gw_executive_board_members 
  WHERE is_active = true
) AND verified = false;
-- First, deactivate the current secretary (KJ) 
UPDATE public.gw_executive_board_members 
SET 
  is_active = false,
  updated_at = now()
WHERE position = 'secretary' AND is_active = true;

-- Add Adrianna Highgate as the new Secretary
INSERT INTO public.gw_executive_board_members (
  user_id,
  position,
  academic_year,
  is_active,
  appointed_date,
  notes,
  primary_tab
)
SELECT 
  user_id,
  'secretary',
  '2025',
  true,
  CURRENT_DATE,
  'Appointed as Secretary',
  'dashboard'
FROM public.gw_profiles 
WHERE email = 'ad.l.highgate@gmail.com';
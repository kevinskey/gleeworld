-- Delete any existing secretary records to avoid constraint conflicts
DELETE FROM public.gw_executive_board_members 
WHERE position = 'secretary';

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
  'Appointed as Secretary - replacing previous secretary',
  'dashboard'
FROM public.gw_profiles 
WHERE email = 'ad.l.highgate@gmail.com';
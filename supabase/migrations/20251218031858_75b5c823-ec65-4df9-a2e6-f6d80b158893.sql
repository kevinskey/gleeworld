-- Add Aaliyah Deere as active tour_manager
INSERT INTO public.gw_executive_board_members (
  user_id,
  position,
  is_active,
  academic_year,
  appointed_date,
  primary_tab
) VALUES (
  'dfff3751-fb25-487e-8135-23dfde69ca3d',
  'tour_manager',
  true,
  '2024-2025',
  CURRENT_DATE,
  'dashboard'
);
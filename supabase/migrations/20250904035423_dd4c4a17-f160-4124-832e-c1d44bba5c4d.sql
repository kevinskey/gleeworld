-- Update the existing treasurer record to point to Rayne Stewart
UPDATE public.gw_executive_board_members 
SET user_id = '5a7197d5-bf6b-4658-a25d-5dcc99ee6e81'
WHERE position = 'treasurer' 
  AND academic_year = '2025-2026' 
  AND is_active = true;
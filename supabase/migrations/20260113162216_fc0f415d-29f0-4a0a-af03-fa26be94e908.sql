-- Fix Rayne Stewart's full name in profile
UPDATE gw_profiles 
SET full_name = 'Rayne Stewart'
WHERE user_id = '5a7197d5-bf6b-4658-a25d-5dcc99ee6e81';

-- Update S2 Section Leader to Elissa Jefferson
UPDATE gw_executive_board_members 
SET user_id = 'f4934dc9-31c5-4af9-a587-1d86c4315bdf',
    updated_at = NOW()
WHERE position = 'section_leader_s2' 
  AND is_active = true;

-- Update A2 Section Leader to Gabrielle Magee
UPDATE gw_executive_board_members 
SET user_id = 'ca078422-2259-4303-85c6-9d9738ea88ba',
    updated_at = NOW()
WHERE position = 'section_leader_a2' 
  AND is_active = true;

-- Add S1 Section Leader - Dana Thompson
INSERT INTO gw_executive_board_members (user_id, position, academic_year, is_active)
VALUES ('2da1718f-ee58-4c9e-a7c3-1f523d34970e', 'section_leader_s1', '2025-2026', true)
ON CONFLICT DO NOTHING;

-- Add A1 Section Leader - Ariana Swindell
INSERT INTO gw_executive_board_members (user_id, position, academic_year, is_active)
VALUES ('6f14998d-a7ba-47f2-a331-5bc44445ec98', 'section_leader_a1', '2025-2026', true)
ON CONFLICT DO NOTHING;
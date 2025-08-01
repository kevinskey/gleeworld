-- Sync existing executive board roles to gw_executive_board_members table
-- First, deactivate all current board members to start fresh
UPDATE gw_executive_board_members SET is_active = false WHERE is_active = true;

-- Insert/update board members based on gw_profiles data
INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT 
  user_id,
  CASE exec_board_role
    WHEN 'president' THEN 'president'
    WHEN 'secretary' THEN 'secretary'
    WHEN 'treasurer' THEN 'treasurer'
    WHEN 'tour_manager' THEN 'tour_manager'
    WHEN 'pr_coordinator' THEN 'pr_coordinator'
    WHEN 'historian' THEN 'historian'
    WHEN 'librarian' THEN 'librarian'
    WHEN 'wardrobe_manager' THEN 'wardrobe_manager'
    WHEN 'chaplain' THEN 'chaplain'
    WHEN 'student_conductor' THEN 'student_conductor'
    WHEN 'section_leader_a1' THEN 'section_leader_a1'
    WHEN 'section_leader_a2' THEN 'section_leader_a2'
    WHEN 'section_leader_s1' THEN 'section_leader_s1'
    WHEN 'section_leader_s2' THEN 'section_leader_s2'
    WHEN 'data_analyst' THEN 'data_analyst'
    WHEN 'assistant_chaplain' THEN 'assistant_chaplain'
    WHEN 'chief-of-staff' THEN 'president' -- Map chief of staff to a valid position temporarily
    WHEN 'co-librarian-1' THEN 'librarian' -- Map co-librarian to librarian temporarily
    ELSE exec_board_role::text
  END::executive_position,
  true,
  '2025',
  CURRENT_DATE
FROM gw_profiles 
WHERE is_exec_board = true 
  AND exec_board_role IS NOT NULL
  AND user_id IS NOT NULL
ON CONFLICT (user_id, position) 
DO UPDATE SET 
  is_active = true,
  academic_year = '2025',
  appointed_date = CURRENT_DATE;
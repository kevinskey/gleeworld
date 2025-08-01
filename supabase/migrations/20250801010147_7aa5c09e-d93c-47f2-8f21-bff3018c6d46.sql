-- Clear all executive board members and repopulate correctly
DELETE FROM gw_executive_board_members;

-- Insert fresh data with proper handling of multiple users per role
WITH prioritized_users AS (
  SELECT 
    user_id,
    exec_board_role,
    ROW_NUMBER() OVER (PARTITION BY exec_board_role ORDER BY created_at ASC) as rn
  FROM gw_profiles 
  WHERE is_exec_board = true 
    AND exec_board_role IN ('president', 'treasurer', 'secretary', 'tour_manager', 'pr_coordinator', 'historian', 'librarian', 'wardrobe_manager', 'chaplain', 'student_conductor', 'section_leader_a1', 'section_leader_a2', 'section_leader_s2', 'data_analyst', 'assistant_chaplain')
    AND user_id IS NOT NULL
)
INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT 
  user_id, 
  exec_board_role::executive_position,
  true,
  '2025',
  CURRENT_DATE
FROM prioritized_users 
WHERE rn = 1;
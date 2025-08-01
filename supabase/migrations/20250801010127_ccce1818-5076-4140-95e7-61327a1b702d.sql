-- Repopulate executive board members correctly from gw_profiles
INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT DISTINCT ON (position) user_id, 
       CASE exec_board_role
         WHEN 'president' THEN 'president'::executive_position
         WHEN 'treasurer' THEN 'treasurer'::executive_position
         WHEN 'secretary' THEN 'secretary'::executive_position
         WHEN 'tour_manager' THEN 'tour_manager'::executive_position
         WHEN 'pr_coordinator' THEN 'pr_coordinator'::executive_position
         WHEN 'historian' THEN 'historian'::executive_position
         WHEN 'librarian' THEN 'librarian'::executive_position
         WHEN 'wardrobe_manager' THEN 'wardrobe_manager'::executive_position
         WHEN 'chaplain' THEN 'chaplain'::executive_position
         WHEN 'student_conductor' THEN 'student_conductor'::executive_position
         WHEN 'section_leader_a1' THEN 'section_leader_a1'::executive_position
         WHEN 'section_leader_a2' THEN 'section_leader_a2'::executive_position
         WHEN 'section_leader_s2' THEN 'section_leader_s2'::executive_position
         WHEN 'data_analyst' THEN 'data_analyst'::executive_position
         WHEN 'assistant_chaplain' THEN 'assistant_chaplain'::executive_position
       END as position,
       true,
       '2025',
       CURRENT_DATE
FROM gw_profiles 
WHERE is_exec_board = true 
  AND exec_board_role IN ('president', 'treasurer', 'secretary', 'tour_manager', 'pr_coordinator', 'historian', 'librarian', 'wardrobe_manager', 'chaplain', 'student_conductor', 'section_leader_a1', 'section_leader_a2', 'section_leader_s2', 'data_analyst', 'assistant_chaplain')
  AND user_id IS NOT NULL
ORDER BY position, created_at;
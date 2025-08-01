-- Add the missing roles that weren't inserted due to the WHERE clause
INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'secretary'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'secretary' AND is_exec_board = true AND user_id IS NOT NULL
LIMIT 1;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)  
SELECT user_id, 'pr_coordinator'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'pr_coordinator' AND is_exec_board = true AND user_id IS NOT NULL
LIMIT 1;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'historian'::executive_position, true, '2025', CURRENT_DATE  
FROM gw_profiles WHERE exec_board_role = 'historian' AND is_exec_board = true AND user_id IS NOT NULL
LIMIT 1;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'librarian'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'librarian' AND is_exec_board = true AND user_id IS NOT NULL  
LIMIT 1;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'wardrobe_manager'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'wardrobe_manager' AND is_exec_board = true AND user_id IS NOT NULL
LIMIT 1;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'section_leader_a1'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'section_leader_a1' AND is_exec_board = true AND user_id IS NOT NULL
LIMIT 1;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'section_leader_a2'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'section_leader_a2' AND is_exec_board = true AND user_id IS NOT NULL
LIMIT 1;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'section_leader_s2'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'section_leader_s2' AND is_exec_board = true AND user_id IS NOT NULL
LIMIT 1;
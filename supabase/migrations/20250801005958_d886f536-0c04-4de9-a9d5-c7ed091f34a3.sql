-- Create a manual sync of executive board assignments
-- First, clear all active board members
UPDATE gw_executive_board_members SET is_active = false WHERE is_active = true;

-- Insert board members manually based on current assignments
INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'president'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'president' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'treasurer'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'treasurer' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'secretary'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'secretary' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'tour_manager'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'tour_manager' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'pr_coordinator'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'pr_coordinator' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'historian'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'historian' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'librarian'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'librarian' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'wardrobe_manager'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'wardrobe_manager' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'chaplain'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'chaplain' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'student_conductor'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'student_conductor' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'section_leader_a1'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'section_leader_a1' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'section_leader_a2'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'section_leader_a2' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'section_leader_s2'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'section_leader_s2' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'data_analyst'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'data_analyst' AND is_exec_board = true AND user_id IS NOT NULL;

INSERT INTO gw_executive_board_members (user_id, position, is_active, academic_year, appointed_date)
SELECT user_id, 'assistant_chaplain'::executive_position, true, '2025', CURRENT_DATE
FROM gw_profiles WHERE exec_board_role = 'assistant_chaplain' AND is_exec_board = true AND user_id IS NOT NULL;
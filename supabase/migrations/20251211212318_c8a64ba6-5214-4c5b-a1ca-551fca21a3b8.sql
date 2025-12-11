-- Update Dana Thompson's profile to mark her as exec board member
UPDATE gw_profiles 
SET is_exec_board = true, 
    exec_board_role = 'Soprano Section Leader'
WHERE user_id = '2da1718f-ee58-4c9e-a7c3-1f523d34970e';
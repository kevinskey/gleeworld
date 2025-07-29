-- Update your profile to have admin access
UPDATE gw_profiles 
SET is_admin = true 
WHERE user_id = '2dacd89c-5673-41cd-92b9-469b03e94683';

-- Alternative: Create an executive board member entry if you prefer that approach
-- INSERT INTO gw_executive_board_members (user_id, position, academic_year, is_active) 
-- VALUES ('2dacd89c-5673-41cd-92b9-469b03e94683', 'president', '2025', true);
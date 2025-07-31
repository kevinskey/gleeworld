-- Update primary_tab constraint to include attendance
ALTER TABLE public.gw_executive_board_members 
DROP CONSTRAINT IF EXISTS check_primary_tab_valid;

ALTER TABLE public.gw_executive_board_members 
ADD CONSTRAINT check_primary_tab_valid 
CHECK (primary_tab IN ('dashboard', 'communications', 'members', 'events', 'finances', 'reports', 'attendance', 'settings'));

-- Update secretary's primary tab to attendance
UPDATE public.gw_executive_board_members 
SET primary_tab = 'attendance'
WHERE position::text = 'secretary' AND is_active = true;
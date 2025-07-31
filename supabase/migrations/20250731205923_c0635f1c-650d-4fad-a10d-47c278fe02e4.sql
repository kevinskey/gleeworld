-- Add primary_tab field to gw_executive_board_members table
ALTER TABLE public.gw_executive_board_members 
ADD COLUMN primary_tab TEXT DEFAULT 'dashboard';

-- Add a check constraint to ensure valid tab names
ALTER TABLE public.gw_executive_board_members 
ADD CONSTRAINT check_primary_tab_valid 
CHECK (primary_tab IN ('dashboard', 'communications', 'members', 'events', 'finances', 'reports', 'settings'));

-- Update existing records with sensible defaults based on position
UPDATE public.gw_executive_board_members 
SET primary_tab = CASE 
  WHEN position = 'president' THEN 'dashboard'
  WHEN position = 'secretary' THEN 'communications'
  WHEN position = 'treasurer' THEN 'finances'
  WHEN position = 'tour_manager' THEN 'events'
  WHEN position = 'pr_coordinator' THEN 'communications'
  WHEN position = 'librarian' THEN 'members'
  WHEN position = 'historian' THEN 'reports'
  WHEN position = 'data_analyst' THEN 'reports'
  WHEN position = 'chaplain' THEN 'communications'
  WHEN position = 'assistant_chaplain' THEN 'communications'
  WHEN position = 'student_conductor' THEN 'members'
  WHEN position = 'wardrobe_manager' THEN 'members'
  WHEN position LIKE 'section_leader_%' THEN 'members'
  ELSE 'dashboard'
END
WHERE primary_tab IS NULL OR primary_tab = 'dashboard';
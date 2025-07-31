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
  WHEN position::text = 'president' THEN 'dashboard'
  WHEN position::text = 'secretary' THEN 'communications'
  WHEN position::text = 'treasurer' THEN 'finances'
  WHEN position::text = 'tour_manager' THEN 'events'
  WHEN position::text = 'pr_coordinator' THEN 'communications'
  WHEN position::text = 'librarian' THEN 'members'
  WHEN position::text = 'historian' THEN 'reports'
  WHEN position::text = 'data_analyst' THEN 'reports'
  WHEN position::text = 'chaplain' THEN 'communications'
  WHEN position::text = 'assistant_chaplain' THEN 'communications'
  WHEN position::text = 'student_conductor' THEN 'members'
  WHEN position::text = 'wardrobe_manager' THEN 'members'
  WHEN position::text LIKE 'section_leader_%' THEN 'members'
  ELSE 'dashboard'
END
WHERE primary_tab IS NULL OR primary_tab = 'dashboard';
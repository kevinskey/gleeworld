-- Remove unique constraint on user_id to allow multiple positions per user
ALTER TABLE public.gw_executive_board_members 
DROP CONSTRAINT IF EXISTS gw_executive_board_members_user_id_key;

-- Add a unique constraint on user_id + position + academic_year instead
-- This prevents duplicate position assignments in the same year but allows multiple positions
ALTER TABLE public.gw_executive_board_members 
ADD CONSTRAINT gw_executive_board_members_user_position_year_unique 
UNIQUE (user_id, position, academic_year);
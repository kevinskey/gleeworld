-- Add executive board columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN exec_board_role TEXT NULL,
ADD COLUMN is_exec_board BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_profiles_exec_board ON public.profiles(is_exec_board) WHERE is_exec_board = true;

-- Update existing admin users to potentially be exec board members
UPDATE public.profiles 
SET is_exec_board = true 
WHERE role IN ('admin', 'super-admin');
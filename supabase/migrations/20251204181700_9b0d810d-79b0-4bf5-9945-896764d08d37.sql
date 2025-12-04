-- Add full_name column to exec_board_interviews for easy identification
ALTER TABLE public.exec_board_interviews
ADD COLUMN full_name VARCHAR(255);
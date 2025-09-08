-- Add foreign key relationship between assignment_submissions and gw_profiles
-- First, let's add the foreign key constraint to connect student_id to gw_profiles.user_id
ALTER TABLE public.assignment_submissions 
ADD CONSTRAINT fk_assignment_submissions_student_id 
FOREIGN KEY (student_id) REFERENCES public.gw_profiles(user_id) ON DELETE CASCADE;
-- Add foreign key relationship between mus240_enrollments and gw_profiles
ALTER TABLE public.mus240_enrollments 
ADD CONSTRAINT fk_mus240_enrollments_student_profile 
FOREIGN KEY (student_id) REFERENCES public.gw_profiles(user_id) 
ON DELETE CASCADE;
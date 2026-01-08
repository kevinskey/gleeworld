-- Drop foreign key constraints that prevent creating placeholder profiles
ALTER TABLE public.gw_profiles 
DROP CONSTRAINT IF EXISTS gw_profiles_user_id_fkey;

ALTER TABLE public.gw_course_enrollments 
DROP CONSTRAINT IF EXISTS gw_course_enrollments_user_id_fkey;

-- Add indexes for performance (the FK provided implicit indexes)
CREATE INDEX IF NOT EXISTS idx_gw_profiles_user_id ON public.gw_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_gw_course_enrollments_user_id ON public.gw_course_enrollments(user_id);
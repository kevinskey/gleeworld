-- Fix foreign key relationships to reference gw_profiles instead of auth.users

-- Drop existing foreign key constraints
ALTER TABLE public.mus240_project_groups 
DROP CONSTRAINT mus240_project_groups_leader_id_fkey;

ALTER TABLE public.mus240_group_memberships 
DROP CONSTRAINT mus240_group_memberships_member_id_fkey;

ALTER TABLE public.mus240_group_applications 
DROP CONSTRAINT mus240_group_applications_applicant_id_fkey;

-- Add new foreign key constraints to gw_profiles
ALTER TABLE public.mus240_project_groups 
ADD CONSTRAINT mus240_project_groups_leader_id_fkey 
FOREIGN KEY (leader_id) REFERENCES public.gw_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.mus240_group_memberships 
ADD CONSTRAINT mus240_group_memberships_member_id_fkey 
FOREIGN KEY (member_id) REFERENCES public.gw_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.mus240_group_applications 
ADD CONSTRAINT mus240_group_applications_applicant_id_fkey 
FOREIGN KEY (applicant_id) REFERENCES public.gw_profiles(user_id) ON DELETE CASCADE;
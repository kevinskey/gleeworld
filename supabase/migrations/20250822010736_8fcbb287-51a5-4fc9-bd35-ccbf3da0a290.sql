-- Add missing foreign key for gw_group_members to gw_profiles
ALTER TABLE public.gw_group_members 
ADD CONSTRAINT fk_gw_group_members_user_profile 
FOREIGN KEY (user_id) REFERENCES public.gw_profiles(user_id) ON DELETE CASCADE;
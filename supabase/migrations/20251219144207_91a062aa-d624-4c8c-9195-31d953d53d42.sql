-- Add foreign key from messenger_group_members to gw_profiles
ALTER TABLE public.messenger_group_members
ADD CONSTRAINT messenger_group_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.gw_profiles(user_id) ON DELETE CASCADE;
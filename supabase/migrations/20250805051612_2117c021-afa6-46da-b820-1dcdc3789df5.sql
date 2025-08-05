-- Add foreign key relationship between gw_dues_records and gw_profiles
ALTER TABLE public.gw_dues_records 
ADD CONSTRAINT fk_gw_dues_records_user_id 
FOREIGN KEY (user_id) REFERENCES public.gw_profiles(user_id) 
ON DELETE CASCADE;
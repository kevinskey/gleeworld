-- Add calendar feed tokens to user profiles for private feed access
ALTER TABLE public.gw_profiles 
ADD COLUMN calendar_feed_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');
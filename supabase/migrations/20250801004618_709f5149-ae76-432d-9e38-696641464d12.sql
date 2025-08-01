-- Add foreign key constraints to link user_id to auth.users for proper joins
-- This will allow PostgREST to automatically join with gw_profiles via user_id

-- For gw_stipend_payments, check if it has a recipient_id that should link to users
ALTER TABLE public.gw_stipend_payments 
ADD CONSTRAINT fk_gw_stipend_payments_recipient 
FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- For gw_dues_records, add foreign key constraint
ALTER TABLE public.gw_dues_records 
ADD CONSTRAINT fk_gw_dues_records_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
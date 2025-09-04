-- Update the status check constraint to include 'payment_plan'
ALTER TABLE public.gw_dues_records 
DROP CONSTRAINT gw_dues_records_status_check;

ALTER TABLE public.gw_dues_records 
ADD CONSTRAINT gw_dues_records_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'waived'::text, 'payment_plan'::text]));
-- Enable real-time updates for user_payments table
ALTER TABLE public.user_payments REPLICA IDENTITY FULL;

-- Add user_payments to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_payments;
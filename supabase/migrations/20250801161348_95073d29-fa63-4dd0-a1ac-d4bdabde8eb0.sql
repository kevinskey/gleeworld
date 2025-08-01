-- Create table for SMS logs
CREATE TABLE IF NOT EXISTS public.gw_sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  message_sid TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notification_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on SMS logs
ALTER TABLE public.gw_sms_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to view SMS logs
CREATE POLICY "Admins can view SMS logs" ON public.gw_sms_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Allow edge function to insert SMS logs (service role)
CREATE POLICY "Service role can insert SMS logs" ON public.gw_sms_logs
  FOR INSERT WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_gw_sms_logs_from_number ON public.gw_sms_logs(from_number);
CREATE INDEX IF NOT EXISTS idx_gw_sms_logs_processed_at ON public.gw_sms_logs(processed_at DESC);
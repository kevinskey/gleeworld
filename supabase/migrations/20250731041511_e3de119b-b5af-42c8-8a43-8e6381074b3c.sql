-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create table to store auto-sync configurations
CREATE TABLE IF NOT EXISTS public.gw_calendar_auto_sync (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    calendar_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sync_frequency_hours INTEGER NOT NULL DEFAULT 24,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_calendar_auto_sync ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own auto-sync configs" 
ON public.gw_calendar_auto_sync 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all auto-sync configs" 
ON public.gw_calendar_auto_sync 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Create trigger for updated_at
CREATE TRIGGER update_gw_calendar_auto_sync_updated_at
BEFORE UPDATE ON public.gw_calendar_auto_sync
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create cron job to sync Google Calendars every hour
SELECT cron.schedule(
  'auto-sync-google-calendars',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://oopmlreysjzuxzylyheb.supabase.co/functions/v1/sync-google-calendar',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcG1scmV5c2p6dXh6eWx5aGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNzg5NTUsImV4cCI6MjA2NDY1NDk1NX0.tDq4HaTAy9p80e4upXFHIA90gUxZSHTH5mnqfpxh7eg"}'::jsonb,
        body:='{"auto_sync": true}'::jsonb
    ) as request_id;
  $$
);
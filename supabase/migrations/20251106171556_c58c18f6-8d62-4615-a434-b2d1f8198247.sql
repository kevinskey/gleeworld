-- Enable real-time updates for alumnae_global_settings

-- Set replica identity to full to capture all column changes
ALTER TABLE public.alumnae_global_settings REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.alumnae_global_settings;
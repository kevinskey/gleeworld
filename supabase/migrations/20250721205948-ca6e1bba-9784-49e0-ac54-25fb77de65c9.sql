-- Enable realtime for gw_notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_notifications;

-- Set replica identity to full to capture complete row data
ALTER TABLE public.gw_notifications REPLICA IDENTITY FULL;
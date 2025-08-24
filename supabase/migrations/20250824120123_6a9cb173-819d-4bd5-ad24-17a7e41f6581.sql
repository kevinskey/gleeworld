-- Enable RLS on the gw_events table first to fix the critical security issue
ALTER TABLE public.gw_events ENABLE ROW LEVEL SECURITY;
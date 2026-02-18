
-- Add optional absence_event_id to link excuse requests to specific attendance events
ALTER TABLE public.gw_rehearsal_excuse_requests 
ADD COLUMN IF NOT EXISTS absence_event_id UUID REFERENCES public.gw_events(id) ON DELETE SET NULL;

-- Add absence_date for display purposes
ALTER TABLE public.gw_rehearsal_excuse_requests 
ADD COLUMN IF NOT EXISTS absence_date DATE;

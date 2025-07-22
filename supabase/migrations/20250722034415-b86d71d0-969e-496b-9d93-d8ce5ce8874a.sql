-- Add columns to support external calendar integration
ALTER TABLE public.gw_events 
ADD COLUMN external_id TEXT,
ADD COLUMN external_source TEXT,
ADD CONSTRAINT unique_external_calendar_event UNIQUE (external_id, external_source, calendar_id);

-- Add index for faster lookups
CREATE INDEX idx_gw_events_external ON public.gw_events(external_id, external_source) WHERE external_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.gw_events.external_id IS 'ID from external calendar system (e.g., Google Calendar event ID)';
COMMENT ON COLUMN public.gw_events.external_source IS 'Source of the external event (e.g., google_calendar, outlook, etc.)';
-- Add linking columns to contracts_v2 for calendar integration
ALTER TABLE public.contracts_v2 
ADD COLUMN IF NOT EXISTS tour_event_id UUID REFERENCES gw_tour_events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS calendar_event_id UUID REFERENCES gw_events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contract_metadata JSONB DEFAULT '{}'::jsonb;

-- Add contract_id to gw_events for reverse lookup
ALTER TABLE public.gw_events 
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts_v2(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contracts_v2_calendar_event_id ON contracts_v2(calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_contracts_v2_tour_event_id ON contracts_v2(tour_event_id);
CREATE INDEX IF NOT EXISTS idx_gw_events_contract_id ON gw_events(contract_id);

-- Add comment for documentation
COMMENT ON COLUMN contracts_v2.calendar_event_id IS 'Links to auto-generated calendar event when contract is signed';
COMMENT ON COLUMN contracts_v2.contract_metadata IS 'Stores parsed contract variables (venue, date, host info) for calendar sync';
COMMENT ON COLUMN gw_events.contract_id IS 'Links to source contract if event was auto-generated from signing';
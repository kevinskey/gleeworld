-- Add host information fields to gw_tour_events for contract generation
ALTER TABLE public.gw_tour_events 
ADD COLUMN IF NOT EXISTS host_name TEXT,
ADD COLUMN IF NOT EXISTS host_location TEXT,
ADD COLUMN IF NOT EXISTS host_signatory_name TEXT,
ADD COLUMN IF NOT EXISTS host_signatory_title TEXT,
ADD COLUMN IF NOT EXISTS host_department TEXT,
ADD COLUMN IF NOT EXISTS venue_name TEXT,
ADD COLUMN IF NOT EXISTS venue_address TEXT,
ADD COLUMN IF NOT EXISTS honorarium_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'performance';
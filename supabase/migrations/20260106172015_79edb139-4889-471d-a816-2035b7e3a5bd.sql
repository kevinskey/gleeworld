-- Add event_qr_token column to gw_events for automatic QR code generation
ALTER TABLE gw_events 
ADD COLUMN event_qr_token UUID DEFAULT gen_random_uuid() NOT NULL;

-- Create unique index for fast lookups during check-in
CREATE UNIQUE INDEX idx_gw_events_qr_token ON gw_events(event_qr_token);

-- Backfill existing events with unique tokens
UPDATE gw_events SET event_qr_token = gen_random_uuid() WHERE event_qr_token IS NULL;
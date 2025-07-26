-- Fix the events table check constraint to allow 'rehearsal' event type
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;

-- Add the updated constraint that includes 'rehearsal'
ALTER TABLE events ADD CONSTRAINT events_event_type_check 
CHECK (event_type IN ('performance', 'rehearsal', 'meeting', 'other', 'concert', 'workshop', 'social', 'fundraiser', 'competition', 'audition', 'masterclass'));
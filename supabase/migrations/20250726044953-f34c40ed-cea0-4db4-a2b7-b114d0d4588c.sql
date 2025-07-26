-- Add missing attendance-related columns to gw_events table
ALTER TABLE public.gw_events 
ADD COLUMN attendance_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN late_arrival_allowed BOOLEAN DEFAULT true,
ADD COLUMN excuse_required BOOLEAN DEFAULT false;
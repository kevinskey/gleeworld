-- Add recurring appointment fields to gw_appointments table
ALTER TABLE public.gw_appointments 
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_type text DEFAULT null,
ADD COLUMN recurrence_interval integer DEFAULT 1,
ADD COLUMN recurrence_days_of_week integer[] DEFAULT null,
ADD COLUMN recurrence_end_date date DEFAULT null,
ADD COLUMN parent_appointment_id uuid DEFAULT null,
ADD COLUMN max_occurrences integer DEFAULT null;

-- Add comments for clarity
COMMENT ON COLUMN public.gw_appointments.is_recurring IS 'Whether this appointment is part of a recurring series';
COMMENT ON COLUMN public.gw_appointments.recurrence_type IS 'Type of recurrence: daily, weekly, monthly, yearly';
COMMENT ON COLUMN public.gw_appointments.recurrence_interval IS 'Interval between recurrences (e.g., every 2 weeks)';
COMMENT ON COLUMN public.gw_appointments.recurrence_days_of_week IS 'Days of week for weekly recurrence (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN public.gw_appointments.recurrence_end_date IS 'End date for recurring appointments';
COMMENT ON COLUMN public.gw_appointments.parent_appointment_id IS 'References the original appointment in a recurring series';
COMMENT ON COLUMN public.gw_appointments.max_occurrences IS 'Maximum number of occurrences for the recurring series';
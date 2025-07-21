-- Add admin phone setting to dashboard settings if it doesn't exist
INSERT INTO public.dashboard_settings (setting_name, setting_value, created_by) 
VALUES ('admin_phone', '+1234567890', NULL)
ON CONFLICT (setting_name) DO NOTHING;

-- Update appointment status to support pending approval workflow
ALTER TABLE public.gw_appointments 
ALTER COLUMN status SET DEFAULT 'pending_approval';

-- Add comment to clarify appointment status flow
COMMENT ON COLUMN public.gw_appointments.status IS 'Appointment status: pending_approval -> scheduled/confirmed -> completed or cancelled';
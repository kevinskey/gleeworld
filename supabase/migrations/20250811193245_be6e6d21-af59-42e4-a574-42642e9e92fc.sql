-- Remove all existing appointment types except Office Hour
UPDATE public.gw_appointment_types 
SET is_active = false 
WHERE name != 'Office Hour';

-- Create Office Hour type if it doesn't exist
INSERT INTO public.gw_appointment_types (name, description, default_duration_minutes, color, is_active)
VALUES ('Office Hour', 'One-on-one consultation session', 30, '#3B82F6', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  default_duration_minutes = EXCLUDED.default_duration_minutes,
  color = EXCLUDED.color,
  is_active = EXCLUDED.is_active;
-- Add 'Wardrobe Fitting' to the allowed appointment types
ALTER TABLE public.gw_appointments 
DROP CONSTRAINT gw_appointments_appointment_type_check;

ALTER TABLE public.gw_appointments 
ADD CONSTRAINT gw_appointments_appointment_type_check 
CHECK (appointment_type = ANY (ARRAY['general'::text, 'meeting'::text, 'consultation'::text, 'rehearsal'::text, 'audition'::text, 'other'::text, 'Wardrobe Fitting'::text]));
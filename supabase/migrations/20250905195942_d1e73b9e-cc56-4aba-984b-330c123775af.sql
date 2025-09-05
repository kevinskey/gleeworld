-- Update appointment_type check constraint to include all types used in the form
ALTER TABLE public.gw_appointments 
DROP CONSTRAINT gw_appointments_appointment_type_check;

ALTER TABLE public.gw_appointments 
ADD CONSTRAINT gw_appointments_appointment_type_check 
CHECK (appointment_type = ANY (ARRAY[
  'general'::text, 
  'meeting'::text, 
  'member-meeting'::text,
  'exec-meeting'::text,
  'voice-lesson'::text,
  'tutorial'::text,
  'consultation'::text, 
  'rehearsal'::text, 
  'audition'::text, 
  'other'::text, 
  'Wardrobe Fitting'::text
]));
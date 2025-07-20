-- Add 'audition' to the appointment_type check constraint
ALTER TABLE gw_appointments 
DROP CONSTRAINT gw_appointments_appointment_type_check;

ALTER TABLE gw_appointments 
ADD CONSTRAINT gw_appointments_appointment_type_check 
CHECK (appointment_type = ANY (ARRAY['general'::text, 'meeting'::text, 'consultation'::text, 'rehearsal'::text, 'audition'::text, 'other'::text]));

-- Re-enable RLS with the correct policy
ALTER TABLE gw_appointments ENABLE ROW LEVEL SECURITY;
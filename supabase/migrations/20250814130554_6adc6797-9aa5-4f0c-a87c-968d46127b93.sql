-- Create RLS policy to allow public read access to audition appointments
-- This is needed for the public booking page to show unavailable slots
CREATE POLICY "Public can view audition appointments for booking" ON public.gw_appointments
FOR SELECT TO public
USING (appointment_type = 'audition');

-- Also update the appointment booking to show unavailable slots properly
-- by ensuring appointment dates and types are properly accessible
-- Drop the conflicting "Anyone can insert appointments" policy if it exists
DROP POLICY IF EXISTS "Anyone can insert appointments" ON public.gw_appointments;

-- Create a new policy specifically for public appointment booking
CREATE POLICY "Public can book appointments" ON public.gw_appointments
FOR INSERT 
WITH CHECK (
  -- Allow public booking for specific appointment types
  appointment_type IN ('consultation', 'general', 'meeting', 'other')
  AND client_name IS NOT NULL 
  AND client_email IS NOT NULL
  AND appointment_date IS NOT NULL
);
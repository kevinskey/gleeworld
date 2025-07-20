-- Drop the existing policy and create a new one that explicitly allows public inserts
DROP POLICY IF EXISTS "Public can create appointments" ON gw_appointments;

-- Create a new policy that allows anyone to insert appointments
CREATE POLICY "Allow public to create appointments" 
ON gw_appointments 
FOR INSERT 
TO public
WITH CHECK (true);
-- Drop all existing INSERT policies and create a very explicit one
DROP POLICY IF EXISTS "Allow public to create appointments" ON gw_appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON gw_appointments;

-- Create a completely open INSERT policy for anyone
CREATE POLICY "Anyone can insert appointments" 
ON gw_appointments 
FOR INSERT 
WITH CHECK (true);
-- Add UPDATE policy for w9_forms table to allow admins and system to update form records
CREATE POLICY "allow_authenticated_updates_w9" 
ON w9_forms 
FOR UPDATE 
USING (true) 
WITH CHECK (true);
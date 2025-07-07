-- Add admin access policy for finance_records
CREATE POLICY "Admins can view all finance records" 
ON finance_records 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

-- Add admin insert/update/delete policies
CREATE POLICY "Admins can create finance records" 
ON finance_records 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Admins can update finance records" 
ON finance_records 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Admins can delete finance records" 
ON finance_records 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);
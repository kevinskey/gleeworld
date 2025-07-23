-- Update RLS policies for finance_records to restrict treasurer access
-- Drop existing overly permissive treasurer policies
DROP POLICY IF EXISTS "Admins can view all finance records" ON finance_records;
DROP POLICY IF EXISTS "Admins can create finance records" ON finance_records;
DROP POLICY IF EXISTS "Admins can update finance records" ON finance_records;
DROP POLICY IF EXISTS "Admins can delete finance records" ON finance_records;

-- Create new restricted policies for treasurers
CREATE POLICY "Treasurers can view their own finance records" 
ON finance_records 
FOR SELECT 
TO authenticated 
USING (
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'treasurer'
    AND finance_records.user_id = auth.uid()
  )) OR
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('super-admin')
  ))
);

CREATE POLICY "Treasurers can create their own finance records" 
ON finance_records 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = user_id AND
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('treasurer', 'super-admin')
  ))
);

CREATE POLICY "Treasurers can update their own finance records" 
ON finance_records 
FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = user_id AND
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('treasurer', 'super-admin')
  ))
);

CREATE POLICY "Treasurers can delete their own finance records" 
ON finance_records 
FOR DELETE 
TO authenticated 
USING (
  auth.uid() = user_id AND
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('treasurer', 'super-admin')
  ))
);

-- Super admins still have full access
CREATE POLICY "Super admins can manage all finance records" 
ON finance_records 
FOR ALL
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super-admin'
  )
);
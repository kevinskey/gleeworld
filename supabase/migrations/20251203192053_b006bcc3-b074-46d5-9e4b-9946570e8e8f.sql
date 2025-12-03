-- Enable RLS on gw_enrollments
ALTER TABLE public.gw_enrollments ENABLE ROW LEVEL SECURITY;

-- Students can view their own enrollments
CREATE POLICY "Students can view their own enrollments"
ON public.gw_enrollments
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Admins and instructors can view all enrollments
CREATE POLICY "Admins can view all enrollments"
ON public.gw_enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'instructor')
  )
);

-- Admins can insert enrollments
CREATE POLICY "Admins can insert enrollments"
ON public.gw_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'instructor')
  )
);

-- Admins can update enrollments
CREATE POLICY "Admins can update enrollments"
ON public.gw_enrollments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'instructor')
  )
);

-- Admins can delete enrollments
CREATE POLICY "Admins can delete enrollments"
ON public.gw_enrollments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'instructor')
  )
);
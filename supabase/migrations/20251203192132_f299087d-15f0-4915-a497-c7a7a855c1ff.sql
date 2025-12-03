-- Enable RLS on gw_courses
ALTER TABLE public.gw_courses ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view courses
CREATE POLICY "Authenticated users can view courses"
ON public.gw_courses
FOR SELECT
TO authenticated
USING (true);

-- Admins can manage courses
CREATE POLICY "Admins can insert courses"
ON public.gw_courses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can update courses"
ON public.gw_courses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can delete courses"
ON public.gw_courses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);
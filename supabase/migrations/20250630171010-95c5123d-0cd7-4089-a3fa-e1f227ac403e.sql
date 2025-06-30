
-- Disable RLS temporarily to clear any policy conflicts
ALTER TABLE public.w9_forms DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.w9_forms ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies completely
DROP POLICY IF EXISTS "Universal W9 submission policy" ON public.w9_forms;
DROP POLICY IF EXISTS "Authenticated users can view their own W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Admins can view all W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Authenticated users can delete their own W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Admins can delete any W9 forms" ON public.w9_forms;

-- Create the simplest possible INSERT policy that allows everything
CREATE POLICY "Allow all W9 submissions" 
ON public.w9_forms 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow authenticated users to view their own forms
CREATE POLICY "View own W9 forms" 
ON public.w9_forms 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Allow admins to view all forms
CREATE POLICY "Admin view all W9 forms" 
ON public.w9_forms 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- Allow authenticated users to delete their own forms
CREATE POLICY "Delete own W9 forms" 
ON public.w9_forms 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Allow admins to delete any forms
CREATE POLICY "Admin delete any W9 forms" 
ON public.w9_forms 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

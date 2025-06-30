
-- First, let's completely reset the W9 forms RLS policies to ensure they work properly
DROP POLICY IF EXISTS "Anyone can submit W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Users can view their own W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Admins can view all W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Allow users to manage their own W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Allow guest users to submit W9 forms" ON public.w9_forms;

-- Create a simple, universal INSERT policy that allows anyone to submit W9 forms
-- This should work for both authenticated and anonymous users
CREATE POLICY "Universal W9 submission policy" 
ON public.w9_forms 
FOR INSERT 
WITH CHECK (true);

-- Allow authenticated users to view their own forms
CREATE POLICY "Authenticated users can view their own W9 forms" 
ON public.w9_forms 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Allow admins to view all forms
CREATE POLICY "Admins can view all W9 forms" 
ON public.w9_forms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

-- Allow authenticated users to delete their own forms
CREATE POLICY "Authenticated users can delete their own W9 forms" 
ON public.w9_forms 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Allow admins to delete any forms
CREATE POLICY "Admins can delete any W9 forms" 
ON public.w9_forms 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

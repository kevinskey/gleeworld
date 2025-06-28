
-- First, let's drop all existing policies on w9_forms to start fresh
DROP POLICY IF EXISTS "Users can view their own W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Users can create their own W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Users can update their own W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Allow users to manage their own W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Allow guest users to submit W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Allow admins to view all W9 forms" ON public.w9_forms;

-- Create a simple, permissive policy for INSERT that allows anyone to insert
CREATE POLICY "Anyone can submit W9 forms" 
ON public.w9_forms 
FOR INSERT 
WITH CHECK (true);

-- Allow authenticated users to view their own forms
CREATE POLICY "Users can view their own W9 forms" 
ON public.w9_forms 
FOR SELECT 
USING (auth.uid() = user_id);

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

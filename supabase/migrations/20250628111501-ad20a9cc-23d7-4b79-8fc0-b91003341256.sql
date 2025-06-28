
-- Enable RLS on w9_forms table if not already enabled
ALTER TABLE public.w9_forms ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own W9 forms
CREATE POLICY "Allow users to manage their own W9 forms" 
ON public.w9_forms 
FOR ALL 
USING (auth.uid() = user_id);

-- Allow guest users to submit W9 forms (insert only, no user_id required)
CREATE POLICY "Allow guest users to submit W9 forms" 
ON public.w9_forms 
FOR INSERT 
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Allow admins to view all W9 forms
CREATE POLICY "Allow admins to view all W9 forms" 
ON public.w9_forms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

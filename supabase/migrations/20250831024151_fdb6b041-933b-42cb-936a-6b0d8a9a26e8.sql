-- Re-enable RLS and create proper policies for mus240_video_edits
ALTER TABLE public.mus240_video_edits ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view video edits
CREATE POLICY "Anyone can view video edits" 
ON public.mus240_video_edits 
FOR SELECT 
USING (true);

-- Only admins and super admins can insert video edits
CREATE POLICY "Admins can insert video edits" 
ON public.mus240_video_edits 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Only admins and super admins can update video edits
CREATE POLICY "Admins can update video edits" 
ON public.mus240_video_edits 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Only admins and super admins can delete video edits
CREATE POLICY "Admins can delete video edits" 
ON public.mus240_video_edits 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);
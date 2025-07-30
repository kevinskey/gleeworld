-- Fix RLS policies for pr_images to allow users to see their own uploaded images
-- and allow general viewing of all PR images

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "PR coordinators and admins can view all PR images" ON public.pr_images;
DROP POLICY IF EXISTS "PR coordinators and admins can insert PR images" ON public.pr_images;
DROP POLICY IF EXISTS "PR coordinators and admins can update PR images" ON public.pr_images;
DROP POLICY IF EXISTS "PR coordinators and admins can delete PR images" ON public.pr_images;

-- Create new policies that allow broader access
-- Anyone can view PR images (for public gallery)
CREATE POLICY "Anyone can view PR images" 
ON public.pr_images 
FOR SELECT 
USING (true);

-- Users can insert their own PR images
CREATE POLICY "Users can insert PR images" 
ON public.pr_images 
FOR INSERT 
WITH CHECK (uploaded_by = auth.uid());

-- Users can update their own images, admins can update any
CREATE POLICY "Users can update their own PR images or admins can update any" 
ON public.pr_images 
FOR UPDATE 
USING (
  uploaded_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);

-- Users can delete their own images, admins can delete any
CREATE POLICY "Users can delete their own PR images or admins can delete any" 
ON public.pr_images 
FOR DELETE 
USING (
  uploaded_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM gw_profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_admin = true OR p.is_super_admin = true OR p.exec_board_role = 'pr_coordinator')
  )
);
-- Fix the viewing policy for spiritual reflections
-- Drop the old policy
DROP POLICY IF EXISTS "Members can view published reflections" ON public.gw_spiritual_reflections;

-- Create a proper policy for viewing shared reflections
CREATE POLICY "Members can view shared reflections" 
ON public.gw_spiritual_reflections 
FOR SELECT 
USING (
  -- Allow chaplains and admins to see all reflections
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role = 'chaplain')
  ) OR
  -- Allow members to see reflections that are shared to members
  (is_shared_to_members = true)
);

-- Update the existing reflection to have proper visibility
UPDATE public.gw_spiritual_reflections 
SET 
  is_published = true,
  visibility = 'members'
WHERE is_shared_to_members = true;
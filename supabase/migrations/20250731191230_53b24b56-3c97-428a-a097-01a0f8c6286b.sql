-- Fix audition time blocks RLS policies to allow executive board members to delete auditions

-- First, let's add a DELETE policy for executive board members and admins
CREATE POLICY "Executive board members and admins can delete audition time blocks"
ON public.audition_time_blocks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- Also allow executive board members to create and update audition time blocks
CREATE POLICY "Executive board members can create audition time blocks"
ON public.audition_time_blocks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Executive board members can update audition time blocks"
ON public.audition_time_blocks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);
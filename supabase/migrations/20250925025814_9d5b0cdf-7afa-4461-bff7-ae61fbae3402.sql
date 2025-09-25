-- Fix RLS policy for wardrobe inventory to properly check admin status
DROP POLICY IF EXISTS "Executive board and admins can manage inventory" ON public.gw_wardrobe_inventory;

CREATE POLICY "Executive board and admins can manage inventory" 
ON public.gw_wardrobe_inventory 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin'))
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin'))
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);
-- Fix gw_tours RLS - FOR ALL policy needs WITH CHECK for updates
DROP POLICY IF EXISTS "Tour managers and admins can manage tours" ON public.gw_tours;

-- Create separate policies with proper WITH CHECK
CREATE POLICY "Tour managers and admins can select tours"
ON public.gw_tours
FOR SELECT
USING (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());

CREATE POLICY "Tour managers and admins can insert tours"
ON public.gw_tours
FOR INSERT
WITH CHECK (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());

CREATE POLICY "Tour managers and admins can update tours"
ON public.gw_tours
FOR UPDATE
USING (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager())
WITH CHECK (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());

CREATE POLICY "Tour managers and admins can delete tours"
ON public.gw_tours
FOR DELETE
USING (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());
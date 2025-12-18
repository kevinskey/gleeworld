-- Fix gw_tour_cities RLS - FOR ALL policy needs WITH CHECK
DROP POLICY IF EXISTS "Tour managers and admins can manage tour cities" ON public.gw_tour_cities;

CREATE POLICY "Tour managers and admins can select tour cities"
ON public.gw_tour_cities
FOR SELECT
USING (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());

CREATE POLICY "Tour managers and admins can insert tour cities"
ON public.gw_tour_cities
FOR INSERT
WITH CHECK (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());

CREATE POLICY "Tour managers and admins can update tour cities"
ON public.gw_tour_cities
FOR UPDATE
USING (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager())
WITH CHECK (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());

CREATE POLICY "Tour managers and admins can delete tour cities"
ON public.gw_tour_cities
FOR DELETE
USING (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());

-- Fix gw_tour_participants RLS too
DROP POLICY IF EXISTS "Tour managers and admins can manage tour participants" ON public.gw_tour_participants;

CREATE POLICY "Tour managers and admins can select tour participants"
ON public.gw_tour_participants
FOR SELECT
USING (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());

CREATE POLICY "Tour managers and admins can insert tour participants"
ON public.gw_tour_participants
FOR INSERT
WITH CHECK (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());

CREATE POLICY "Tour managers and admins can update tour participants"
ON public.gw_tour_participants
FOR UPDATE
USING (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager())
WITH CHECK (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());

CREATE POLICY "Tour managers and admins can delete tour participants"
ON public.gw_tour_participants
FOR DELETE
USING (is_current_user_admin_or_super_admin() OR is_current_user_tour_manager());
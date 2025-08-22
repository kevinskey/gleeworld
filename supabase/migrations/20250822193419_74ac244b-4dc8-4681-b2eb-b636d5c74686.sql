-- Create function to check if user is a secretary
CREATE OR REPLACE FUNCTION public.user_has_secretary_role(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = user_id_param 
    AND position = 'secretary'::executive_position
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = user_id_param 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Grant secretary full access to attendance management
CREATE POLICY "Secretaries can manage all attendance records" 
ON public.attendance 
FOR ALL 
USING (public.user_has_secretary_role(auth.uid()))
WITH CHECK (public.user_has_secretary_role(auth.uid()));

-- Grant secretary full access to member profiles management
CREATE POLICY "Secretaries can manage all member profiles" 
ON public.gw_profiles 
FOR ALL 
USING (public.user_has_secretary_role(auth.uid()))
WITH CHECK (public.user_has_secretary_role(auth.uid()));

-- Grant secretary access to view and manage events for attendance purposes
CREATE POLICY "Secretaries can view all events for attendance" 
ON public.gw_events 
FOR SELECT 
USING (public.user_has_secretary_role(auth.uid()));

-- Grant secretary access to manage user roles if needed
CREATE POLICY "Secretaries can view user roles" 
ON public.app_roles 
FOR SELECT 
USING (public.user_has_secretary_role(auth.uid()));

-- Grant secretary access to executive board member management
CREATE POLICY "Secretaries can manage executive board members" 
ON public.gw_executive_board_members 
FOR ALL 
USING (public.user_has_secretary_role(auth.uid()))
WITH CHECK (public.user_has_secretary_role(auth.uid()));
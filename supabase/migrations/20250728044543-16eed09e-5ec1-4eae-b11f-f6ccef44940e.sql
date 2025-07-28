-- Fix gw_events RLS policies for proper admin access
-- First, drop the conflicting policies
DROP POLICY IF EXISTS "Admins can manage all events" ON public.gw_events;
DROP POLICY IF EXISTS "Admins can manage all gw_events" ON public.gw_events;
DROP POLICY IF EXISTS "Event creators can manage their gw_events" ON public.gw_events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.gw_events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.gw_events;

-- Create new, unified admin management policy
CREATE POLICY "Super admins and admins can manage all gw_events"
ON public.gw_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.is_super_admin = true 
      OR gw_profiles.is_admin = true 
      OR gw_profiles.role IN ('admin', 'super-admin')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.is_super_admin = true 
      OR gw_profiles.is_admin = true 
      OR gw_profiles.role IN ('admin', 'super-admin')
    )
  )
);

-- Create policy for event creators to manage their own events
CREATE POLICY "Event creators can manage their own gw_events"
ON public.gw_events
FOR ALL
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Create policy for executive board members to manage events
CREATE POLICY "Executive board can manage gw_events"
ON public.gw_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.is_exec_board = true 
      OR gw_profiles.role = 'executive'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid()
    AND (
      gw_profiles.is_exec_board = true 
      OR gw_profiles.role = 'executive'
    )
  )
);
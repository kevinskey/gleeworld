-- Drop existing policies on gw_events
DROP POLICY IF EXISTS "Admins and exec board can manage all events" ON public.gw_events;
DROP POLICY IF EXISTS "Authenticated users can view public events" ON public.gw_events;

-- Recreate comprehensive policy for exec board + admins to manage all events
CREATE POLICY "Admins and exec board can manage all events"
ON public.gw_events
FOR ALL
TO authenticated
USING (
  -- Admins and super-admins can manage all events
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid() 
    AND (
      gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true
    )
  )
  OR
  -- All active exec board members can manage all events
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE gw_executive_board_members.user_id = auth.uid()
    AND gw_executive_board_members.is_active = true
  )
  OR
  -- Event creators can manage their own events
  created_by = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE gw_profiles.user_id = auth.uid() 
    AND (
      gw_profiles.is_admin = true 
      OR gw_profiles.is_super_admin = true
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE gw_executive_board_members.user_id = auth.uid()
    AND gw_executive_board_members.is_active = true
  )
  OR
  created_by = auth.uid()
);

-- Separate policy for viewing public events (for non-exec authenticated users)
CREATE POLICY "Authenticated users can view public events"
ON public.gw_events
FOR SELECT
TO authenticated
USING (is_public = true);
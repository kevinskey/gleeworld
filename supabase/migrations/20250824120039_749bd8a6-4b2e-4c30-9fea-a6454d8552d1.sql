-- Update RLS policies for gw_events table to allow super admin, admin, and exec board to manage events

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can manage all events" ON public.gw_events;
DROP POLICY IF EXISTS "Admins can manage all events" ON public.gw_events;
DROP POLICY IF EXISTS "Executive board can manage all events" ON public.gw_events;
DROP POLICY IF EXISTS "Authorized users can create events" ON public.gw_events;
DROP POLICY IF EXISTS "Authorized users can update events" ON public.gw_events;
DROP POLICY IF EXISTS "Authorized users can delete events" ON public.gw_events;

-- Create comprehensive policy for all operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins and exec board can manage all events"
ON public.gw_events
FOR ALL
TO authenticated
USING (
  -- Super admins, admins, and executive board members can access all events
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_super_admin = true OR is_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR is_public = true  -- Anyone can view public events
)
WITH CHECK (
  -- Only super admins, admins, and executive board members can create/modify events
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_super_admin = true OR is_admin = true)
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Ensure everyone can view public events
CREATE POLICY "Anyone can view public events"
ON public.gw_events
FOR SELECT
TO authenticated
USING (is_public = true);

-- Policy for anonymous users to view public events  
CREATE POLICY "Anonymous users can view public events"
ON public.gw_events
FOR SELECT
TO anon
USING (is_public = true);
-- Update RLS policies for gw_calendars to ensure proper visibility
DROP POLICY IF EXISTS "Everyone can view calendars" ON public.gw_calendars;
DROP POLICY IF EXISTS "Admins can manage calendars" ON public.gw_calendars;

-- Allow everyone to view all calendars
CREATE POLICY "Everyone can view calendars" 
ON public.gw_calendars 
FOR SELECT 
USING (true);

-- Allow authenticated users to create calendars
CREATE POLICY "Authenticated users can create calendars" 
ON public.gw_calendars 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow admins to manage all calendars, and users to manage their own
CREATE POLICY "Users can manage calendars" 
ON public.gw_calendars 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND (
    -- Admins can manage all calendars
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    ) OR
    -- Users can manage calendars they created
    created_by = auth.uid() OR
    -- Allow management of calendars with null created_by (system calendars)
    created_by IS NULL
  )
);
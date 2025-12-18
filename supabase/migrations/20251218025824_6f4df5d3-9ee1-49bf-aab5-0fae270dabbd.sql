-- Drop existing policies
DROP POLICY IF EXISTS "Admins and exec board can manage tour roster" ON public.gw_tour_roster;
DROP POLICY IF EXISTS "Members can view tour roster" ON public.gw_tour_roster;

-- Create separate policies for each operation

-- SELECT: All members can view
CREATE POLICY "Members can view tour roster"
ON public.gw_tour_roster
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Admins and exec board can insert
CREATE POLICY "Admins and exec board can insert tour roster"
ON public.gw_tour_roster
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

-- UPDATE: Admins and exec board can update
CREATE POLICY "Admins and exec board can update tour roster"
ON public.gw_tour_roster
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);

-- DELETE: Admins and exec board can delete
CREATE POLICY "Admins and exec board can delete tour roster"
ON public.gw_tour_roster
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR is_exec_board = true)
  )
);
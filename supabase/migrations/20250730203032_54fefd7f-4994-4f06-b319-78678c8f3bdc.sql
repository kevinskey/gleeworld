-- Create a more permissive policy for authenticated users to view executive board members
-- This is needed for the Call Meeting dialog to show who will be invited
CREATE POLICY "Authenticated users can view active executive board members" 
ON public.gw_executive_board_members 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Also, let's add a policy to allow viewing the basic profile info needed for the meeting dialog
CREATE POLICY "Authenticated users can view basic profile info of exec board members"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE gw_executive_board_members.user_id = gw_profiles.user_id 
    AND gw_executive_board_members.is_active = true
  )
);
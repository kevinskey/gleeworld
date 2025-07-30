-- Clean up conflicting RLS policies on gw_profiles table
-- Remove the overly permissive policy we added earlier
DROP POLICY IF EXISTS "Allow authenticated users to view profiles for exec board context" ON public.gw_profiles;

-- Remove the conflicting select all policy
DROP POLICY IF EXISTS "gw_profiles_select_all" ON public.gw_profiles;

-- Create a more targeted policy that allows users to view their own profile and basic info for executive board members
CREATE POLICY "Users can view their own profile and exec board basic info" 
ON public.gw_profiles 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR 
  (
    user_id IN (
      SELECT gw_executive_board_members.user_id 
      FROM public.gw_executive_board_members 
      WHERE gw_executive_board_members.is_active = true
    )
  )
);
-- Fix infinite recursion in RLS policies

-- First, create security definer functions to prevent recursion
CREATE OR REPLACE FUNCTION public.is_current_user_executive_board_member()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin_or_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_tour_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'tour_manager'::executive_position 
    AND is_active = true
  );
$$;

-- Drop problematic policies on gw_executive_board_members
DROP POLICY IF EXISTS "Users can view their own executive board membership" ON gw_executive_board_members;
DROP POLICY IF EXISTS "Admins can manage executive board members" ON gw_executive_board_members;
DROP POLICY IF EXISTS "Executive board members can view other members" ON gw_executive_board_members;

-- Create new policies using security definer functions
CREATE POLICY "Users can view their own executive board membership" 
ON gw_executive_board_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage executive board members" 
ON gw_executive_board_members 
FOR ALL 
USING (public.is_current_user_admin_or_super_admin());

CREATE POLICY "Executive board members can view other members" 
ON gw_executive_board_members 
FOR SELECT 
USING (public.is_current_user_admin_or_super_admin() OR public.is_current_user_executive_board_member());

-- Fix booking requests policies to use the security definer functions
DROP POLICY IF EXISTS "Admins and Tour Managers can view all booking requests" ON gw_booking_requests;
DROP POLICY IF EXISTS "Admins and Tour Managers can update booking requests" ON gw_booking_requests;

-- Recreate with corrected logic
CREATE POLICY "Admins and Tour Managers can view all booking requests" 
ON gw_booking_requests 
FOR SELECT 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);

CREATE POLICY "Admins and Tour Managers can update booking requests" 
ON gw_booking_requests 
FOR UPDATE 
USING (
  public.is_current_user_admin_or_super_admin() 
  OR public.is_current_user_tour_manager()
);

-- Fix any problematic budget policies
DROP POLICY IF EXISTS "Users can view budgets they created or have access to" ON budgets;
DROP POLICY IF EXISTS "Users can update budgets they have edit permission for" ON budgets;

-- Recreate budget policies without recursion
CREATE POLICY "Users can view budgets they created or have access to" 
ON budgets 
FOR SELECT 
USING (
  created_by = auth.uid() 
  OR public.is_current_user_admin_or_super_admin()
  OR EXISTS (
    SELECT 1 FROM budget_permissions bp
    WHERE bp.budget_id = budgets.id 
    AND bp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM budget_user_associations bua
    WHERE bua.budget_id = budgets.id 
    AND bua.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update budgets they have edit permission for" 
ON budgets 
FOR UPDATE 
USING (
  created_by = auth.uid() 
  OR public.is_current_user_admin_or_super_admin()
  OR EXISTS (
    SELECT 1 FROM budget_permissions bp
    WHERE bp.budget_id = budgets.id 
    AND bp.user_id = auth.uid()
    AND bp.permission_type IN ('edit', 'manage')
  )
  OR EXISTS (
    SELECT 1 FROM budget_user_associations bua
    WHERE bua.budget_id = budgets.id 
    AND bua.user_id = auth.uid()
    AND bua.permission_type IN ('edit', 'manage')
  )
);
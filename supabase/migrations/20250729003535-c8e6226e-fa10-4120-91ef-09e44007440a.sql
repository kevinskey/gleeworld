-- Fix infinite recursion in RLS policies

-- Drop existing problematic policies for gw_executive_board_members
DROP POLICY IF EXISTS "allow_executive_members_select" ON public.gw_executive_board_members;
DROP POLICY IF EXISTS "allow_executive_members_insert" ON public.gw_executive_board_members;
DROP POLICY IF EXISTS "allow_executive_members_update" ON public.gw_executive_board_members;
DROP POLICY IF EXISTS "allow_executive_members_delete" ON public.gw_executive_board_members;

-- Drop existing problematic policies for budgets
DROP POLICY IF EXISTS "budgets_select_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_insert_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_update_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_delete_policy" ON public.budgets;

-- Create simple, non-recursive policies for gw_executive_board_members
CREATE POLICY "executive_members_select" ON public.gw_executive_board_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "executive_members_insert" ON public.gw_executive_board_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "executive_members_update" ON public.gw_executive_board_members
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "executive_members_delete" ON public.gw_executive_board_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create simple, non-recursive policies for budgets
CREATE POLICY "budgets_select" ON public.budgets
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "budgets_insert" ON public.budgets
  FOR INSERT WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "budgets_update" ON public.budgets
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

CREATE POLICY "budgets_delete" ON public.budgets
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );
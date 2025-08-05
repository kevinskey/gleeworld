-- CRITICAL SECURITY FIX: Essential RLS policies for unprotected tables

-- Budget Attachments  
CREATE POLICY "Budget attachment access control"
  ON public.budget_attachments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_attachments.budget_id 
    AND (b.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

-- Budget Permissions
CREATE POLICY "Budget permission management"
  ON public.budget_permissions FOR ALL
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  ));

-- Budget User Associations  
CREATE POLICY "Budget association management"
  ON public.budget_user_associations FOR ALL
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  ));

-- Finance Records - admin only
CREATE POLICY "Finance records admin access"
  ON public.finance_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  ));

-- Food Budget - admin and event creators
CREATE POLICY "Food budget access control"
  ON public.food_budget FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  ));

-- Generated Contracts  
CREATE POLICY "Generated contracts access control"
  ON public.generated_contracts FOR ALL
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  ));
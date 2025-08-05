-- CRITICAL SECURITY FIX: Add missing RLS policies for tables without policies (corrected)

-- Budget Attachments (no user_id column, use budget relationship)
CREATE POLICY "Users can view budget attachments they have access to"
  ON public.budget_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_attachments.budget_id 
    AND (b.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.budget_permissions bp 
                 WHERE bp.budget_id = b.id AND bp.user_id = auth.uid()) OR
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

CREATE POLICY "Users can upload attachments to budgets they can edit"
  ON public.budget_attachments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_attachments.budget_id 
    AND (b.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.budget_permissions bp 
                 WHERE bp.budget_id = b.id AND bp.user_id = auth.uid() AND bp.permission_type IN ('edit', 'manage')) OR
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

-- Budget Permissions
CREATE POLICY "Budget creators and admins can manage permissions"
  ON public.budget_permissions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_permissions.budget_id 
    AND (b.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

CREATE POLICY "Users can view their own budget permissions"
  ON public.budget_permissions FOR SELECT
  USING (user_id = auth.uid());

-- Budget User Associations  
CREATE POLICY "Budget creators and admins can manage associations"
  ON public.budget_user_associations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.budgets b
    WHERE b.id = budget_user_associations.budget_id 
    AND (b.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

-- Audition Analytics (view table - allow admins only)
CREATE POLICY "Admins can view audition analytics"
  ON public.audition_analytics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  ));

-- Events table (public events viewable by all)
CREATE POLICY "Everyone can view public events"
  ON public.events FOR SELECT
  USING (is_public = true);

CREATE POLICY "Event creators and admins can manage events"
  ON public.events FOR ALL
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  ));

-- Finance Records
CREATE POLICY "Admins can manage finance records"
  ON public.finance_records FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  ));

-- Food Budget (event-based)
CREATE POLICY "Event creators and admins can manage food budget"
  ON public.food_budget FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = food_budget.event_id 
    AND (e.created_by = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gw_profiles gp 
                 WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)))
  ));

-- Generated Contracts
CREATE POLICY "Contract creators and admins can manage contracts"
  ON public.generated_contracts FOR ALL
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.gw_profiles gp 
    WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
  ));
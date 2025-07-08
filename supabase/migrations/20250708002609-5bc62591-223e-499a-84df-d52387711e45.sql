-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view budgets they have permission for" ON public.budgets;
DROP POLICY IF EXISTS "Users can update budgets they have edit permission for" ON public.budgets;

-- Create security definer functions to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.user_has_budget_permission(budget_id_param uuid, permission_type_param text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.budget_permissions
    WHERE budget_id = budget_id_param 
    AND user_id = auth.uid() 
    AND permission_type = permission_type_param
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_budget(budget_id_param uuid, created_by_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT (
    created_by_param = auth.uid() 
    OR public.user_has_budget_permission(budget_id_param, 'view')
    OR public.user_has_budget_permission(budget_id_param, 'edit')
    OR public.user_has_budget_permission(budget_id_param, 'manage')
    OR public.is_admin(auth.uid()) 
    OR public.is_super_admin(auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_budget(budget_id_param uuid, created_by_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT (
    created_by_param = auth.uid() 
    OR public.user_has_budget_permission(budget_id_param, 'edit')
    OR public.user_has_budget_permission(budget_id_param, 'manage')
    OR public.is_admin(auth.uid()) 
    OR public.is_super_admin(auth.uid())
  );
$$;

-- Recreate the policies using the security definer functions
CREATE POLICY "Users can view budgets they have permission for" 
ON public.budgets 
FOR SELECT 
USING (public.user_can_view_budget(id, created_by));

CREATE POLICY "Users can update budgets they have edit permission for" 
ON public.budgets 
FOR UPDATE 
USING (public.user_can_edit_budget(id, created_by));

-- Simplify other policies to avoid recursion
DROP POLICY IF EXISTS "Users can manage categories for budgets they have access to" ON public.budget_categories;
CREATE POLICY "Users can manage categories for budgets they have access to" 
ON public.budget_categories 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b 
    WHERE b.id = budget_categories.budget_id 
    AND public.user_can_view_budget(b.id, b.created_by)
  )
);

DROP POLICY IF EXISTS "Users can view transactions for budgets they have access to" ON public.budget_transactions;
CREATE POLICY "Users can view transactions for budgets they have access to" 
ON public.budget_transactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b 
    WHERE b.id = budget_transactions.budget_id 
    AND public.user_can_view_budget(b.id, b.created_by)
  )
);

DROP POLICY IF EXISTS "Admins and authorized users can manage budget transactions" ON public.budget_transactions;
CREATE POLICY "Admins and authorized users can manage budget transactions" 
ON public.budget_transactions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.budgets b 
    WHERE b.id = budget_transactions.budget_id 
    AND public.user_can_edit_budget(b.id, b.created_by)
  )
);
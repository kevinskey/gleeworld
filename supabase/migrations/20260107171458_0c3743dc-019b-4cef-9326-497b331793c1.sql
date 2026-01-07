-- Fix RLS policy for gw_learning_objectives - role name mismatch
DROP POLICY IF EXISTS "Admins manage objectives" ON public.gw_learning_objectives;

CREATE POLICY "Admins manage objectives"
ON public.gw_learning_objectives
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_roles
    WHERE app_roles.user_id = auth.uid()
      AND app_roles.role IN ('admin', 'superadmin', 'super_admin', 'super-admin')
      AND app_roles.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_roles
    WHERE app_roles.user_id = auth.uid()
      AND app_roles.role IN ('admin', 'superadmin', 'super_admin', 'super-admin')
      AND app_roles.is_active = true
  )
);
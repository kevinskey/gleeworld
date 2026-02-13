
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;

CREATE POLICY "Admins and exec board can view all activity logs"
ON public.activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true OR p.is_exec_board = true)
  )
);

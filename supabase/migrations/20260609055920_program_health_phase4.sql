-- Program Health Phase 4 — action-plan archival policy.
--
-- Phase 0 shipped gw_action_plans with INSERT + SELECT RLS only. Phase 4
-- introduces a Generate / Archive flow in the UI, so admins need UPDATE
-- access to flip status from 'active' to 'archived'. Additive — re-running
-- this file is safe.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'gw_action_plans'
      AND policyname = 'Admins can update action plans'
  ) THEN
    CREATE POLICY "Admins can update action plans"
      ON public.gw_action_plans
      FOR UPDATE
      USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()))
      WITH CHECK (is_admin(auth.uid()) OR is_super_admin(auth.uid()));
  END IF;
END $$;

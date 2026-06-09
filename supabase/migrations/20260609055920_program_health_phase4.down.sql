-- Down migration for Program Health Phase 4.
DROP POLICY IF EXISTS "Admins can update action plans" ON public.gw_action_plans;

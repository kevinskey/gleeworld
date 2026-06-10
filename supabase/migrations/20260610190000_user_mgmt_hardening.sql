-- User-management hardening:
--
-- 1. admin_delete_user_data(): the admin-delete-user edge function ran ~10
--    sequential deletes from the client, so a mid-sequence failure orphaned
--    rows (it also referenced tables that don't exist on the live DB:
--    payments, singer_contract_assignments, gw_attendance). One function
--    call = one transaction; corrected table names.
-- 2. executive_members_update let exec members UPDATE their own membership
--    row (e.g. self-reactivate is_active). Admin/secretary ALL policies
--    already cover legitimate management, so the policy is dropped.

CREATE OR REPLACE FUNCTION public.admin_delete_user_data(p_user_id uuid, p_user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.gw_user_module_permissions WHERE user_id = p_user_id;
  DELETE FROM public.username_permissions WHERE user_email = p_user_email;
  DELETE FROM public.gw_executive_board_members WHERE user_id = p_user_id;
  DELETE FROM public.user_preferences WHERE user_id = p_user_id;
  DELETE FROM public.gw_notification_preferences WHERE user_id = p_user_id;
  DELETE FROM public.gw_user_module_orders WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.contract_user_assignments WHERE user_id = p_user_id;
  -- Keep financial/attendance history, anonymized.
  UPDATE public.gw_payments SET notes = 'User account deleted' WHERE user_id = p_user_id;
  UPDATE public.gw_event_attendance SET notes = 'User deleted', updated_at = now() WHERE user_id = p_user_id;
  DELETE FROM public.gw_profiles WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user_data(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_data(uuid, text) TO service_role;

DROP POLICY IF EXISTS executive_members_update ON public.gw_executive_board_members;

-- Close the gw_profiles privilege-escalation gaps:
--
-- 1. The escalation trigger only guarded role/is_admin/is_super_admin. Users
--    could set their own is_exec_board (which gw_profiles_update_policy and
--    ~52 other policies treat as a power grant), exec_board_role, dues_paid,
--    account_balance, disabled, is_section_leader.
-- 2. The trigger only fired on UPDATE; INSERT policies allow self-insert with
--    no column limits, so a user with an orphaned/missing profile row could
--    insert one with admin flags set.
--
-- For the newly protected columns we silently restore the old value instead
-- of raising: the self-service profile editor (GleeWorldProfileManager)
-- round-trips exec_board_role ('' vs NULL) on every save, so raising would
-- break ordinary profile edits. role/is_admin/is_super_admin keep the
-- original RAISE behavior.

CREATE OR REPLACE FUNCTION public.prevent_gw_profile_privilege_escalation_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN := FALSE;
BEGIN
  -- Backend/service operations (signup trigger, edge functions) pass through.
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Nobody (admins included) may change their own role/admin flags via
  -- direct update — pre-existing behavior, kept as-is.
  IF TG_OP = 'UPDATE' AND OLD.user_id = auth.uid() AND (
    OLD.is_admin IS DISTINCT FROM NEW.is_admin OR
    OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin OR
    OLD.role IS DISTINCT FROM NEW.role
  ) THEN
    PERFORM public.log_security_event(
      'unauthorized_self_privilege_escalation',
      'gw_profile',
      NEW.id,
      jsonb_build_object('user_id', auth.uid(), 'old_role', OLD.role, 'new_role', NEW.role)
    );
    RAISE EXCEPTION 'Security violation: Cannot modify your own privileges';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  ) INTO caller_is_admin;

  IF caller_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_admin := false;
    NEW.is_super_admin := false;
    NEW.is_exec_board := false;
    NEW.exec_board_role := NULL;
    NEW.is_section_leader := false;
    NEW.dues_paid := false;
    NEW.account_balance := 0;
    NEW.disabled := false;
    IF NEW.role IN ('admin', 'super-admin') THEN
      NEW.role := 'member';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE by a non-admin: hard-fail on the core privilege columns
  -- (pre-existing behavior), silently preserve the rest.
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin OR
     OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin OR
     OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM public.log_security_event(
      'unauthorized_privilege_escalation_attempt',
      'gw_profile',
      NEW.id,
      jsonb_build_object(
        'attempted_by', auth.uid(),
        'target_user', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'old_is_admin', OLD.is_admin,
        'new_is_admin', NEW.is_admin,
        'old_is_super_admin', OLD.is_super_admin,
        'new_is_super_admin', NEW.is_super_admin
      )
    );
    RAISE EXCEPTION 'Permission denied: Only admins can modify roles or admin privileges';
  END IF;

  IF OLD.is_exec_board IS DISTINCT FROM NEW.is_exec_board OR
     OLD.exec_board_role IS DISTINCT FROM NEW.exec_board_role OR
     OLD.is_section_leader IS DISTINCT FROM NEW.is_section_leader OR
     OLD.dues_paid IS DISTINCT FROM NEW.dues_paid OR
     OLD.account_balance IS DISTINCT FROM NEW.account_balance OR
     OLD.disabled IS DISTINCT FROM NEW.disabled THEN
    PERFORM public.log_security_event(
      'protected_profile_columns_reverted',
      'gw_profile',
      NEW.id,
      jsonb_build_object('attempted_by', auth.uid(), 'target_user', NEW.user_id)
    );
    NEW.is_exec_board := OLD.is_exec_board;
    NEW.exec_board_role := OLD.exec_board_role;
    NEW.is_section_leader := OLD.is_section_leader;
    NEW.dues_paid := OLD.dues_paid;
    NEW.account_balance := OLD.account_balance;
    NEW.disabled := OLD.disabled;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_gw_profile_privilege_escalation_enhanced_trigger ON public.gw_profiles;
CREATE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger
  BEFORE INSERT OR UPDATE ON public.gw_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_gw_profile_privilege_escalation_enhanced();

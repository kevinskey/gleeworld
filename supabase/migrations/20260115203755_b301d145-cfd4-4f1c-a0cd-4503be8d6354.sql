-- Fix: multiple privilege-escalation triggers on gw_profiles cause admin updates to fail.
-- Keep only the newest enhanced trigger (with service_role bypass) and remove older overlapping triggers.

DROP TRIGGER IF EXISTS prevent_privilege_escalation_trigger ON public.gw_profiles;
DROP TRIGGER IF EXISTS prevent_self_privilege_escalation_trigger ON public.gw_profiles;
DROP TRIGGER IF EXISTS prevent_privilege_escalation_gw_profiles ON public.gw_profiles;

-- Ensure the enhanced trigger is present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'gw_profiles'
      AND t.tgname = 'prevent_gw_profile_privilege_escalation_enhanced_trigger'
  ) THEN
    CREATE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger
    BEFORE UPDATE ON public.gw_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_gw_profile_privilege_escalation_enhanced();
  END IF;
END;
$$;
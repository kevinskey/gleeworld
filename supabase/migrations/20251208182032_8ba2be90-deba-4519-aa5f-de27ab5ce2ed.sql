-- Disable all privilege escalation triggers
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_privilege_escalation_gw_profiles;
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_privilege_escalation_trigger;
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_self_privilege_escalation_trigger;

-- Grant admin permissions to Maria Maxie (m_whitfield@msn.com)
UPDATE public.gw_profiles 
SET is_admin = true 
WHERE user_id = '96d0f845-cd24-4685-b0be-343decfd32c0';

-- Re-enable all triggers
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_privilege_escalation_gw_profiles;
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_privilege_escalation_trigger;
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_self_privilege_escalation_trigger;
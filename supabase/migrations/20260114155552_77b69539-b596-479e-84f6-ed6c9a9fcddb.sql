-- Temporarily disable all privilege escalation triggers
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_privilege_escalation_gw_profiles;
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_privilege_escalation_trigger;
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_self_privilege_escalation_trigger;

-- Add Genesis Harris as admin in app_roles for MUS240 TA privileges
INSERT INTO public.app_roles (user_id, role, granted_at, is_active)
VALUES ('44a30d6c-eefd-4144-a0b0-b3618ec1b7a5', 'admin', now(), true)
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true, granted_at = now();

-- Update her profile to reflect admin status
UPDATE public.gw_profiles
SET is_admin = true,
    role = 'admin',
    updated_at = now()
WHERE user_id = '44a30d6c-eefd-4144-a0b0-b3618ec1b7a5';

-- Update the TA record with notes reflecting full admin rights
UPDATE public.course_teaching_assistants
SET notes = 'Teaching Assistant with full admin rights - can edit, add, delete student and content data',
    updated_at = now()
WHERE user_id = '44a30d6c-eefd-4144-a0b0-b3618ec1b7a5' AND course_code = 'MUS240';

-- Re-enable all privilege escalation triggers
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_privilege_escalation_gw_profiles;
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_privilege_escalation_trigger;
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_self_privilege_escalation_trigger;
-- Temporarily disable ALL privilege escalation triggers for bulk alumna fix
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_privilege_escalation_gw_profiles;

-- 1) Add alumna role in user_roles (secure source of truth)
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'alumna'::public.app_role
FROM public.gw_profiles p
WHERE p.created_at::date = (now() at time zone 'utc')::date
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Remove student role to avoid precedence conflicts
DELETE FROM public.user_roles ur
WHERE ur.user_id IN (
  SELECT p.user_id
  FROM public.gw_profiles p
  WHERE p.created_at::date = (now() at time zone 'utc')::date
)
AND ur.role = 'student'::public.app_role;

-- 3) Sync legacy profile role field for consistency
UPDATE public.gw_profiles p
SET role = 'alumna'
WHERE p.created_at::date = (now() at time zone 'utc')::date;

-- Re-enable triggers
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_privilege_escalation_gw_profiles;

-- Temporarily disable the privilege escalation triggers
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_privilege_escalation_trigger;
ALTER TABLE public.gw_profiles DISABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;

-- Update fans to students if they registered after July 25, 2025
UPDATE public.gw_profiles 
SET role = 'student',
    updated_at = now()
WHERE role = 'fan' 
AND created_at > '2025-07-25'::date;

-- Re-enable the triggers
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_privilege_escalation_trigger;
ALTER TABLE public.gw_profiles ENABLE TRIGGER prevent_gw_profile_privilege_escalation_enhanced_trigger;

-- Show the results
SELECT 
  role,
  COUNT(*) as user_count
FROM public.gw_profiles 
GROUP BY role
ORDER BY user_count DESC;
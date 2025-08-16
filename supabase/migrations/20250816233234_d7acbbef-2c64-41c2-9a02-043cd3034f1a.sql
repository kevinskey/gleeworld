-- Create user_roles entries for existing auditioners in gw_profiles
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT gp.user_id, 'auditioner'::app_role
FROM public.gw_profiles gp
WHERE gp.role = 'auditioner'
AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = gp.user_id AND ur.role = 'auditioner'::app_role
);

-- Add auditioners to fy_students table so they appear in the first-year console
-- Create a default cohort for auditioners if it doesn't exist
INSERT INTO public.fy_cohorts (
    id,
    name,
    academic_year,
    start_date,
    coordinator_id,
    is_active,
    description
)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Auditioners 2025-2026',
    '2025-2026',
    '2025-08-01'::date,
    (SELECT user_id FROM public.gw_profiles WHERE is_admin = true LIMIT 1),
    true,
    'Cohort for managing auditioners in the first-year console'
WHERE NOT EXISTS (
    SELECT 1 FROM public.fy_cohorts 
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Add all auditioners to the auditioners cohort
INSERT INTO public.fy_students (
    user_id,
    cohort_id,
    academic_status
)
SELECT DISTINCT
    gp.user_id,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'auditioner'
FROM public.gw_profiles gp
WHERE gp.role = 'auditioner'
AND NOT EXISTS (
    SELECT 1 FROM public.fy_students fs 
    WHERE fs.user_id = gp.user_id
);
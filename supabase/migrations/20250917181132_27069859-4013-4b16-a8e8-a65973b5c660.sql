-- Create Karrington Adams profile directly without conflict handling
-- Since she doesn't exist yet, we can safely insert
INSERT INTO public.gw_profiles (
    user_id,
    email,
    full_name,
    role,
    verified,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'karringtonadams@spelman.edu',
    'Karrington Adams',
    'member',
    false,  -- Set to false so she needs to verify through normal signup
    now(),
    now()
);

-- Also ensure she's enrolled in MUS240 if that table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mus240_enrollments') THEN
        INSERT INTO public.mus240_enrollments (
            user_id,
            semester,
            enrolled_at,
            status
        ) 
        SELECT 
            gw_profiles.user_id,
            'Fall 2024',
            now(),
            'enrolled'
        FROM public.gw_profiles 
        WHERE email = 'karringtonadams@spelman.edu';
    END IF;
END $$;
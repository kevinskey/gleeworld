-- Grant Karrington Adams direct access by creating her profile manually
-- This bypasses the edge function permission issue

DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
BEGIN
    -- Create user in auth.users if not exists
    INSERT INTO auth.users (
        id,
        email,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmed_at,
        raw_user_meta_data
    ) VALUES (
        new_user_id,
        'karringtonadams@spelman.edu',
        now(),
        now(),
        now(),
        now(),
        '{"full_name": "Karrington Adams"}'::jsonb
    ) ON CONFLICT (email) DO NOTHING;

    -- Get the actual user ID (in case user already existed)
    SELECT id INTO new_user_id 
    FROM auth.users 
    WHERE email = 'karringtonadams@spelman.edu';

    -- Create or update profile
    INSERT INTO public.gw_profiles (
        user_id,
        email,
        full_name,
        role,
        verified,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        'karringtonadams@spelman.edu',
        'Karrington Adams',
        'member',
        true,
        now(),
        now()
    ) ON CONFLICT (user_id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        verified = EXCLUDED.verified,
        updated_at = now();

    -- Also enroll in MUS240 if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mus240_enrollments') THEN
        INSERT INTO public.mus240_enrollments (
            user_id,
            semester,
            enrolled_at,
            status
        ) VALUES (
            new_user_id,
            'Fall 2024',
            now(),
            'enrolled'
        ) ON CONFLICT (user_id, semester) DO NOTHING;
    END IF;

END $$;
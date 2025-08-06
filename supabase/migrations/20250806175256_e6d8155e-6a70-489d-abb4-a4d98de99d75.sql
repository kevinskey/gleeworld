-- Use the secure function to update auditioner roles
-- This bypasses the security trigger by using the admin-approved function

DO $$
DECLARE
    user_record RECORD;
    admin_user_id UUID;
BEGIN
    -- Get the first super admin user to perform the role changes
    SELECT user_id INTO admin_user_id 
    FROM public.gw_profiles 
    WHERE is_super_admin = true OR role = 'super-admin' 
    LIMIT 1;
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'No super admin found to perform role transitions';
    END IF;
    
    -- Update each user with audition applications to auditioner role
    FOR user_record IN 
        SELECT DISTINCT ga.user_id
        FROM public.gw_auditions ga
        JOIN public.gw_profiles gp ON ga.user_id = gp.user_id
        WHERE ga.status IN ('pending', 'submitted', 'under_review')
        AND gp.role NOT IN ('admin', 'super-admin')
    LOOP
        -- Use the secure role update function
        PERFORM public.secure_update_user_role(
            user_record.user_id, 
            'auditioner',
            'Automated transition: User has pending audition application'
        );
    END LOOP;
    
    RAISE NOTICE 'Successfully updated auditioner roles';
END $$;
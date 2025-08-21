-- Get the current authenticated user and add them to message groups
DO $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the user with email kpj64110@gmail.com
    SELECT id INTO current_user_id 
    FROM auth.users 
    WHERE email = 'kpj64110@gmail.com'
    LIMIT 1;
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'User not found, using first available user';
        SELECT id INTO current_user_id 
        FROM auth.users 
        LIMIT 1;
    END IF;
    
    -- Clear existing group members for this user to avoid conflicts
    DELETE FROM gw_group_members WHERE user_id = current_user_id;
    
    -- Add the user to all message groups using the text enum value
    INSERT INTO gw_group_members (group_id, user_id, role)
    SELECT id, current_user_id, 'admin'
    FROM gw_message_groups
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Added user % to all message groups', current_user_id;
END $$;
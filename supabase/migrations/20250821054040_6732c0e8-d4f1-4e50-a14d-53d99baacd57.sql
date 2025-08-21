-- Get the current authenticated user
DO $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the first user from auth.users since we can't use auth.uid() in migrations
    SELECT id INTO current_user_id 
    FROM auth.users 
    WHERE email = 'kpj64110@gmail.com'
    LIMIT 1;
    
    -- Clear existing group members for this user to avoid conflicts
    DELETE FROM gw_group_members WHERE user_id = current_user_id;
    
    -- Add the user to all message groups
    INSERT INTO gw_group_members (group_id, user_id, role)
    SELECT id, current_user_id, 'admin'::gw_group_role
    FROM gw_message_groups
    ON CONFLICT (group_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Added user % to all message groups', current_user_id;
END $$;
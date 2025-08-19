-- Grant music library access to all members (corrected)
DO $$
DECLARE
    music_module_id UUID;
BEGIN
    -- Get the music library module ID
    SELECT id INTO music_module_id 
    FROM gw_modules 
    WHERE key = 'music-library';
    
    -- Grant view permission to all users with member role
    INSERT INTO gw_module_permissions (user_id, module_id, permission_type, granted_at, is_active)
    SELECT DISTINCT 
        p.user_id,
        music_module_id,
        'view',
        NOW(),
        true
    FROM gw_profiles p
    WHERE p.role = 'member' 
    AND p.user_id NOT IN (
        SELECT mp.user_id 
        FROM gw_module_permissions mp 
        WHERE mp.module_id = music_module_id 
        AND mp.permission_type = 'view'
        AND mp.is_active = true
    )
    AND music_module_id IS NOT NULL;
    
    -- Also update the module to have default view permissions for members (correct JSONB format)
    UPDATE gw_modules 
    SET default_permissions = '["view"]'::jsonb
    WHERE key = 'music-library';
    
    RAISE NOTICE 'Granted music library access to all members';
END $$;
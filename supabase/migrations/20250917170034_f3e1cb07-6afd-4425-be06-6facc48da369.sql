-- Update Genesis's admin permissions
UPDATE gw_profiles 
SET is_admin = true, verified = true 
WHERE email = 'genesisharris@spelman.edu';

-- Check RLS policies for mus240_project_groups to ensure students can edit
DO $$
BEGIN
    -- Drop existing policies if they exist to recreate them with proper permissions
    DROP POLICY IF EXISTS "Students can update groups they are members of" ON mus240_project_groups;
    DROP POLICY IF EXISTS "Students can edit their groups" ON mus240_project_groups;
    
    -- Create policy allowing students to update groups they are members of
    CREATE POLICY "Students can edit groups they belong to" ON mus240_project_groups
    FOR UPDATE
    USING (
        -- Allow if user is admin/super admin
        EXISTS (
            SELECT 1 FROM gw_profiles 
            WHERE user_id = auth.uid() 
            AND (is_admin = true OR is_super_admin = true)
        )
        OR
        -- Allow if user is a member of the group
        EXISTS (
            SELECT 1 FROM mus240_group_memberships 
            WHERE group_id = mus240_project_groups.id 
            AND member_id = auth.uid()
        )
    );
    
    -- Ensure students can view all groups
    DROP POLICY IF EXISTS "Students can view groups" ON mus240_project_groups;
    CREATE POLICY "Students can view groups" ON mus240_project_groups
    FOR SELECT
    USING (true);
    
    -- Ensure students can create groups  
    DROP POLICY IF EXISTS "Students can create groups" ON mus240_project_groups;
    CREATE POLICY "Students can create groups" ON mus240_project_groups
    FOR INSERT
    WITH CHECK (true);
END $$;
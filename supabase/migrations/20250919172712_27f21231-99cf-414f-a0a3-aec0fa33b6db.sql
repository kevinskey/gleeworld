-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('mus240_project_groups', 'mus240_group_memberships')
ORDER BY tablename, policyname;
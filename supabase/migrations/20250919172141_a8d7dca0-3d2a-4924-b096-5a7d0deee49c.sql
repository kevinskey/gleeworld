-- Fix the member count inconsistencies and test join functionality
-- First update all member counts to be accurate
UPDATE mus240_project_groups 
SET member_count = (
  SELECT COUNT(*) 
  FROM mus240_group_memberships 
  WHERE group_id = mus240_project_groups.id
);

-- Now let's test if a student can actually join a group
-- Try to add a student to a group that has space
DO $$
DECLARE
    test_student_id UUID;
    test_group_id UUID;
    insert_result RECORD;
BEGIN
    -- Get a student who isn't in a group yet
    SELECT student_id INTO test_student_id
    FROM mus240_enrollments e
    WHERE e.enrollment_status = 'enrolled' 
    AND e.semester = 'Fall 2025'
    AND e.student_id NOT IN (
        SELECT DISTINCT member_id 
        FROM mus240_group_memberships 
        WHERE member_id IS NOT NULL
    )
    LIMIT 1;
    
    -- Get a group with available space
    SELECT id INTO test_group_id
    FROM mus240_project_groups 
    WHERE member_count < max_members 
    LIMIT 1;
    
    IF test_student_id IS NOT NULL AND test_group_id IS NOT NULL THEN
        RAISE NOTICE 'Testing join: Student % trying to join group %', test_student_id, test_group_id;
        
        -- Test the is_mus240_student function
        RAISE NOTICE 'is_mus240_student check: %', is_mus240_student(test_student_id);
        
        -- Try to insert as the student would
        BEGIN
            INSERT INTO mus240_group_memberships (group_id, member_id, role)
            VALUES (test_group_id, test_student_id, 'member');
            
            RAISE NOTICE 'Successfully added student to group!';
            
            -- Clean up the test
            DELETE FROM mus240_group_memberships 
            WHERE group_id = test_group_id AND member_id = test_student_id;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to add student to group: %', SQLERRM;
        END;
        
    ELSE
        RAISE NOTICE 'Could not find test student or group';
    END IF;
END $$;
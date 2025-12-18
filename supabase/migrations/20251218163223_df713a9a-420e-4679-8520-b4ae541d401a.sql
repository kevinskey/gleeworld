-- Update Camryn Williams enrollment to Fall 2025 to match the system
UPDATE mus240_enrollments 
SET semester = 'Fall 2025', updated_at = NOW()
WHERE student_id = '40ab4051-da9f-4526-b76c-a3882753234e';
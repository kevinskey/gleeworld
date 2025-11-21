-- Add is_practice field to glee_academy_tests table
ALTER TABLE glee_academy_tests 
ADD COLUMN is_practice boolean DEFAULT false;

-- Add index for faster queries
CREATE INDEX idx_glee_academy_tests_is_practice ON glee_academy_tests(is_practice);

-- Comment
COMMENT ON COLUMN glee_academy_tests.is_practice IS 'Marks test as a practice test (non-graded, appears in practice test tab for students)';
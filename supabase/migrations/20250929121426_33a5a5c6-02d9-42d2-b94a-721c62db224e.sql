-- Fix the specific invalid grade (12/10 should be 10/10)
UPDATE mus240_journal_grades 
SET overall_score = 10.0 
WHERE journal_id = '5ddbe477-7a4c-462b-b60e-42e89e837a92' 
AND overall_score = 12.0;

-- Add a function to validate journal grades based on assignment points
CREATE OR REPLACE FUNCTION validate_journal_grade() 
RETURNS TRIGGER AS $$
DECLARE
  max_points INTEGER;
BEGIN
  -- Get the max points for the assignment from mus240_assignments table
  -- For now, default to 17 points (standard for journal assignments)
  max_points := 17;
  
  -- Validate that the score doesn't exceed maximum
  IF NEW.overall_score > max_points OR NEW.overall_score < 0 THEN
    RAISE EXCEPTION 'Invalid grade: Overall score must be between 0 and % points', max_points;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger to validate grades on insert/update
DROP TRIGGER IF EXISTS trigger_validate_journal_grade ON mus240_journal_grades;
CREATE TRIGGER trigger_validate_journal_grade
  BEFORE INSERT OR UPDATE ON mus240_journal_grades
  FOR EACH ROW EXECUTE FUNCTION validate_journal_grade();
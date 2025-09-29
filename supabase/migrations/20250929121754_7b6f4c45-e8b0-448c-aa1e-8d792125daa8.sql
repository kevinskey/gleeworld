-- Create a function to get assignment max points (default to 10 for journal assignments)
CREATE OR REPLACE FUNCTION get_assignment_max_points(assignment_id_param text)
RETURNS INTEGER AS $$
BEGIN
  -- For now, set lj2 and other journal assignments to 10 points
  -- This can be extended to read from an assignments table later
  CASE assignment_id_param
    WHEN 'lj2' THEN RETURN 10;
    WHEN 'lj1' THEN RETURN 10;
    ELSE RETURN 17; -- Default for other assignments
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Update the validation function to use assignment-specific max points
CREATE OR REPLACE FUNCTION validate_journal_grade() 
RETURNS TRIGGER AS $$
DECLARE
  max_points INTEGER;
BEGIN
  -- Get the max points for the specific assignment
  max_points := get_assignment_max_points(NEW.assignment_id);
  
  -- Validate that the score doesn't exceed maximum
  IF NEW.overall_score > max_points OR NEW.overall_score < 0 THEN
    RAISE EXCEPTION 'Invalid grade: Overall score must be between 0 and % points for assignment %', max_points, NEW.assignment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix Maya's lj2 grade from 15 to 10 (assuming it should be the maximum)
UPDATE mus240_journal_grades 
SET overall_score = 10.0,
    letter_grade = 'A+'
WHERE assignment_id = 'lj2' 
AND overall_score > 10;
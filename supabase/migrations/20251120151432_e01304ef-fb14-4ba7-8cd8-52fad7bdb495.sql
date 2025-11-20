-- Update the get_assignment_max_points function to use 20 points as default for journal assignments
CREATE OR REPLACE FUNCTION get_assignment_max_points(assignment_id_param text)
RETURNS INTEGER AS $$
BEGIN
  -- All journal assignments now use 20 points as the standard
  -- This can be extended to read from an assignments table if different assignments have different max points
  RETURN 20;
END;
$$ LANGUAGE plpgsql;
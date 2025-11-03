-- Drop any triggers that reference the old 'feedback' column
DROP TRIGGER IF EXISTS update_mus240_journal_grades_timestamp ON mus240_journal_grades;

-- Recreate the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger for updating timestamps
CREATE TRIGGER update_mus240_journal_grades_timestamp
BEFORE UPDATE ON mus240_journal_grades
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
-- Add grading fields to mus240_midterm_submissions table
ALTER TABLE public.mus240_midterm_submissions 
ADD COLUMN grade numeric(5,2) NULL,
ADD COLUMN feedback text NULL,
ADD COLUMN graded_by uuid NULL,
ADD COLUMN graded_at timestamp with time zone NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.mus240_midterm_submissions.grade IS 'Grade out of 100 points';
COMMENT ON COLUMN public.mus240_midterm_submissions.feedback IS 'Instructor feedback for the student';
COMMENT ON COLUMN public.mus240_midterm_submissions.graded_by IS 'User ID of the instructor who graded this submission';
COMMENT ON COLUMN public.mus240_midterm_submissions.graded_at IS 'Timestamp when the submission was graded';
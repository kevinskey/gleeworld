-- Add visibility toggle columns for course features
ALTER TABLE public.gw_courses 
ADD COLUMN IF NOT EXISTS show_assignments boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_discussions boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_journals boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_polls boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_tests boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_grades boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.gw_courses.show_assignments IS 'Toggle visibility of Assignments tab for students';
COMMENT ON COLUMN public.gw_courses.show_discussions IS 'Toggle visibility of Discussions tab for students';
COMMENT ON COLUMN public.gw_courses.show_journals IS 'Toggle visibility of Journals tab for students';
COMMENT ON COLUMN public.gw_courses.show_polls IS 'Toggle visibility of Polls tab for students';
COMMENT ON COLUMN public.gw_courses.show_tests IS 'Toggle visibility of Tests tab for students';
COMMENT ON COLUMN public.gw_courses.show_grades IS 'Toggle visibility of Grades tab for students';
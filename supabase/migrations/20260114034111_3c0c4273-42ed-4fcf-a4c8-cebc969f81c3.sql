-- Add columns to support phase-based syllabi and course models
ALTER TABLE gw_syllabus_templates
ADD COLUMN IF NOT EXISTS course_model text,
ADD COLUMN IF NOT EXISTS course_phases jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS course_badge text;

-- Add comment for documentation
COMMENT ON COLUMN gw_syllabus_templates.course_phases IS 'Array of phase objects: {phase, title, dates, goal, topics[], assessments[]}';
COMMENT ON COLUMN gw_syllabus_templates.course_model IS 'Description of the course model/format';
COMMENT ON COLUMN gw_syllabus_templates.course_badge IS 'Optional badge text to display (e.g., "Conducting Studio")';
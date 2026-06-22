-- Tie practice recordings to a Student Practice course so teachers can
-- review their roster's takes and students can opt in via the standard
-- /join/:code enrollment flow.

-- 1) Nullable course_id on recordings (nullable so legacy rows + the
--    "I haven't joined a course yet" case still work).
ALTER TABLE gw_practice_recordings
  ADD COLUMN IF NOT EXISTS course_id uuid
  REFERENCES gw_courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gw_practice_recordings_course_idx
  ON gw_practice_recordings (course_id, created_at DESC)
  WHERE course_id IS NOT NULL;

-- 2) Auto-create a "Student Practice" course in every tenant that
--    doesn't already have one. Uses course_code STUDENT-PRACTICE so the
--    public join URL is /join/STUDENT-PRACTICE.
INSERT INTO gw_courses (
  tenant_id,
  course_code,
  title,
  description,
  is_active,
  is_free
)
SELECT
  t.id,
  'STUDENT-PRACTICE',
  'Student Practice',
  'Record yourself practicing with the metronome. Your teacher reviews each take and replies with feedback.',
  true,
  true
FROM gw_tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM gw_courses c
  WHERE c.tenant_id = t.id AND c.course_code = 'STUDENT-PRACTICE'
);

-- 3) Backfill: any existing recording whose owner is enrolled in this
--    tenant's Student Practice course should be tagged with it. New
--    recordings will set course_id explicitly from the client.
UPDATE gw_practice_recordings r
SET course_id = c.id
FROM gw_courses c
WHERE r.course_id IS NULL
  AND c.tenant_id = r.tenant_id
  AND c.course_code = 'STUDENT-PRACTICE';

-- Migrate MUS 240 legacy submissions into unified gw_submissions so they show up in the UI

INSERT INTO gw_submissions (
  id,
  assignment_id,
  student_id,
  submitted_at,
  content_text,
  content_url,
  raw_payload,
  status,
  legacy_source,
  legacy_id
)
SELECT 
  gen_random_uuid() AS id,
  ga.id AS assignment_id,
  asub.student_id,
  COALESCE(asub.submitted_at, asub.submission_date) AS submitted_at,
  NULL::text AS content_text,
  asub.file_url AS content_url,
  jsonb_build_object(
    'file_name', asub.file_name,
    'file_size', asub.file_size,
    'submission_date', asub.submission_date,
    'grade', asub.grade,
    'feedback', asub.feedback,
    'graded_by', asub.graded_by,
    'graded_at', asub.graded_at,
    'legacy_assignment_id', asub.assignment_id,
    'legacy_submission_id', asub.id
  ) AS raw_payload,
  asub.status::text AS status,
  'mus240' AS legacy_source,
  asub.id::text AS legacy_id
FROM assignment_submissions asub
JOIN gw_assignments ga
  ON ga.legacy_source = 'mus240'
 AND ga.legacy_id = asub.assignment_id
WHERE NOT EXISTS (
  SELECT 1 FROM gw_submissions gs
   WHERE gs.legacy_source = 'mus240' AND gs.legacy_id = asub.id::text
);

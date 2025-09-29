-- Ensure upserts work by adding a unique constraint/index on (poll_id, question_index, student_id)
-- First, remove any duplicates to avoid unique index creation failure
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY poll_id, question_index, student_id
           ORDER BY response_time NULLS LAST, id
         ) AS rn
  FROM public.mus240_poll_responses
)
DELETE FROM public.mus240_poll_responses m
USING duplicates d
WHERE m.id = d.id
  AND d.rn > 1;

-- Create a unique index to support ON CONFLICT upserts
CREATE UNIQUE INDEX IF NOT EXISTS mus240_poll_responses_unique_idx
ON public.mus240_poll_responses (poll_id, question_index, student_id);

-- Optional: small performance index to speed up active poll lookups
CREATE INDEX IF NOT EXISTS mus240_polls_active_idx ON public.mus240_polls (is_active) WHERE is_active = true;
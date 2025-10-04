-- Delete blank midterm submissions (unsubmitted with no answers)
DELETE FROM mus240_midterm_submissions
WHERE is_submitted = false
AND selected_terms = '{}'
AND ring_shout_answer IS NULL
AND field_holler_answer IS NULL
AND negro_spiritual_answer IS NULL
AND blues_answer IS NULL
AND ragtime_answer IS NULL
AND swing_answer IS NULL
AND excerpt_1_genre IS NULL
AND excerpt_2_genre IS NULL
AND excerpt_3_genre IS NULL
AND essay_answer IS NULL;
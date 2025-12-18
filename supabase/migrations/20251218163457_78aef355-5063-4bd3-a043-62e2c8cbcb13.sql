-- Migrate all MUS240 Fall 2024 data to Fall 2025

-- First, handle enrollments - update Fall 2024 to Fall 2025 where student doesn't already have Fall 2025 enrollment
UPDATE mus240_enrollments 
SET semester = 'Fall 2025', updated_at = NOW()
WHERE semester = 'Fall 2024'
AND student_id NOT IN (
  SELECT student_id FROM mus240_enrollments WHERE semester = 'Fall 2025'
);

-- Delete duplicate Fall 2024 enrollments where student already has Fall 2025
DELETE FROM mus240_enrollments 
WHERE semester = 'Fall 2024';

-- Handle grade summaries - update Fall 2024 to Fall 2025 where student doesn't already have Fall 2025
UPDATE mus240_grade_summaries 
SET semester = 'Fall 2025', updated_at = NOW()
WHERE semester = 'Fall 2024'
AND student_id NOT IN (
  SELECT student_id FROM mus240_grade_summaries WHERE semester = 'Fall 2025'
);

-- Delete duplicate Fall 2024 grade summaries where student already has Fall 2025
DELETE FROM mus240_grade_summaries 
WHERE semester = 'Fall 2024';
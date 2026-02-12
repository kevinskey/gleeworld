
-- Remove rubric from Blues Album Review assignment
UPDATE gw_course_assignments
SET rubric_id = 'a1000000-0000-0000-0000-000000000001'
WHERE id = 'ebc6c16b-309c-4054-aca3-fde186db3bf4';

-- Assign the rubric to the 10 Minute Glee World Radio Segment
UPDATE gw_course_assignments
SET rubric_id = 'b2000000-0000-0000-0000-000000000001'
WHERE id = '70f467ab-f01f-4641-b848-d34d86e4a1b4';

-- Update rubric name to be more accurate
UPDATE gw_universal_rubrics
SET name = '10 Minute Glee World Radio Segment Rubric',
    description = 'Rubric for the "10 Minute Glee World Radio Segment" assignment in MUS 240: Survey of African American Music. 100 points total across 5 categories. Optional Bonus (+5): Creative framing (period radio voice, interview format, etc.) or especially strong musical comparison.'
WHERE id = 'b2000000-0000-0000-0000-000000000001';

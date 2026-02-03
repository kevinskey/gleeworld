
-- First delete the duplicate enrollments (newer ones created from direct login)
-- These are the 3 enrollments from Feb 2 that have user_id but no student_profile_id
DELETE FROM gw_course_enrollments
WHERE id IN (
  '657e14b4-2fda-42e9-897c-06dfa37dc7db',  -- Taylor Gamble duplicate
  '95750b4c-0aa2-4da3-8fb9-bcb77b311e16',  -- Rylee McGee duplicate  
  '18dae9dd-19be-401a-882e-1b5294032e58'   -- Leilani Dacus duplicate
);

-- Now link the user accounts to the original CSV-imported enrollments
UPDATE gw_course_enrollments
SET user_id = '8fd32cb1-8e22-4411-bf6d-6c5a5939a9ba'
WHERE id = '0d7b650d-c64c-4bd2-a1be-730c29dabd81';  -- Taylor Gamble CSV enrollment

UPDATE gw_course_enrollments
SET user_id = 'ce444469-f2ef-481a-838b-1c832381503f'
WHERE id = '7f00cd90-a343-45d9-b100-44ee353061c2';  -- Rylee McGee CSV enrollment

UPDATE gw_course_enrollments
SET user_id = 'a7191de0-cec2-4e31-bc4a-d0895cb9b0c9'
WHERE id = '6a78dccc-26ce-48f8-a218-35298caf39c3';  -- Leilani Dacus CSV enrollment

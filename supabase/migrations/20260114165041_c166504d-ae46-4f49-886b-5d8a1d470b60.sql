-- Update recent assignments to Spring 2026 semester
UPDATE mus240_assignments 
SET semester = 'Spring 2026' 
WHERE id IN (
  '315ad12f-5e41-47a8-b750-c12395c472ca',
  '49a6e306-92b4-4717-a8f4-5671b54ca641',
  '9d8af66b-5ec1-4b67-a430-8c2be60c9b58'
);
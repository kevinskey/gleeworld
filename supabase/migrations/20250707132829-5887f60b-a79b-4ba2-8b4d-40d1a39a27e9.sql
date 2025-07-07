-- Delete test/mock financial records
DELETE FROM finance_records 
WHERE description IN ('Stipend for Test Concert', 'Stipend for ette')
   OR description LIKE '%test%'
   OR description LIKE '%mock%';
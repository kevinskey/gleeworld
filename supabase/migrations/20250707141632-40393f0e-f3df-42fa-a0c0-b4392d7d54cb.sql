-- Delete test/mock generated contracts for Kevin Phillip Johnson that are creating duplicate stipend records
DELETE FROM generated_contracts 
WHERE created_by = '4e6c2ec0-1f83-449a-a984-8920f6056ab5' 
AND (
  event_name IN ('Test', 'Test Concert', 'ette') 
  OR (event_name = 'Test Concert' AND stipend IN (500, 5000))
);
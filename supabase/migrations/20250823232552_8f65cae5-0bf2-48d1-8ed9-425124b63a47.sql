-- Delete duplicate bucket of love entries, keeping only one
DELETE FROM gw_buckets_of_love 
WHERE message = 'Wishing all of our 105 members a safe and successful semester! DOC' 
AND created_at = '2025-08-23T23:07:37.100057+00:00'
AND id NOT IN (
  SELECT id FROM gw_buckets_of_love 
  WHERE message = 'Wishing all of our 105 members a safe and successful semester! DOC' 
  AND created_at = '2025-08-23T23:07:37.100057+00:00'
  LIMIT 1
);
-- Remove duplicate events, keeping only the earliest created one for each title/start_date combination
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY title, start_date 
           ORDER BY created_at ASC
         ) as rn
  FROM gw_events
)
DELETE FROM gw_events 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
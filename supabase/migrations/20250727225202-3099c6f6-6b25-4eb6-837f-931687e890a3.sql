-- Remove duplicate events based on title and date (not exact timestamp)
-- Keep only the earliest created event for each title/date combination
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY title, start_date::date 
           ORDER BY created_at ASC
         ) as rn
  FROM gw_events
  WHERE is_public = true
)
DELETE FROM gw_events 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
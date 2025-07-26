-- Check the events table constraint that's causing the issue
SELECT tc.constraint_name, cc.check_clause 
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'events' AND tc.constraint_name LIKE '%event_type%';

-- Also check what event types are currently valid in the gw_events table
SELECT DISTINCT event_type FROM gw_events LIMIT 20;
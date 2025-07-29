-- Delete all events whose start_date is prior to today
DELETE FROM gw_events 
WHERE start_date < CURRENT_DATE;
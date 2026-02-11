
-- Fix Faith Formation events: shift all except the first one by +1 day
-- so they display on Thursday in ET (midnight UTC Friday = 7pm ET Thursday)
UPDATE public.gw_events 
SET start_date = start_date + INTERVAL '1 day',
    end_date = end_date + INTERVAL '1 day'
WHERE title = 'Faith Formation' 
  AND id != '4b2aa17e-5d9d-435e-bf9d-93a2ef59f7b7';

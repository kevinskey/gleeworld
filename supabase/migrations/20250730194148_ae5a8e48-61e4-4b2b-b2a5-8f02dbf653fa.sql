-- Extend audition time blocks by 30 minutes to add 5 more slots per day
UPDATE public.audition_time_blocks 
SET end_date = end_date + INTERVAL '30 minutes',
    updated_at = now()
WHERE is_active = true;
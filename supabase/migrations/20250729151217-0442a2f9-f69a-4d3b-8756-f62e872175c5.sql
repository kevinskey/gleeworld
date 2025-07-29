-- Update audition time blocks to correct EST times
-- Aug 15: 2:30-4:30 PM EST = 19:30-21:30 UTC 
UPDATE public.audition_time_blocks 
SET start_date = '2025-08-15 19:30:00+00',
    end_date = '2025-08-15 21:30:00+00'
WHERE start_date = '2025-08-15 18:30:00+00';

-- Aug 16: 11 AM-1 PM EST = 16:00-18:00 UTC
UPDATE public.audition_time_blocks 
SET start_date = '2025-08-16 16:00:00+00',
    end_date = '2025-08-16 18:00:00+00'
WHERE start_date = '2025-08-16 15:00:00+00';
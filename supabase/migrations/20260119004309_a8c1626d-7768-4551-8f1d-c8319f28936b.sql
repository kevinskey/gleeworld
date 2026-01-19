-- Fix the unique constraint to use liturgical_day instead of date
ALTER TABLE public.usccb_readings DROP CONSTRAINT IF EXISTS usccb_readings_liturgical_date_year_cycle_key;
ALTER TABLE public.usccb_readings ADD CONSTRAINT usccb_readings_day_cycle_key UNIQUE(liturgical_day, year_cycle);
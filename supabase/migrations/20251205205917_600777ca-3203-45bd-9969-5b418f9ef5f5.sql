-- Fix the trailing spaces in Kendall Felton's name for proper matching
UPDATE public.gw_profiles 
SET full_name = TRIM(full_name)
WHERE user_id = '7ce95e4a-4ca3-4871-b8af-6e8f2f8bc745';
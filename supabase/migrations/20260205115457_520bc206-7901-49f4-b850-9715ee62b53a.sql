-- Fix mus240_module_settings - sync is_active with date ranges
UPDATE mus240_module_settings 
SET is_active = (CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date);

-- Fix gw_course_modules for MUS-240
UPDATE gw_course_modules 
SET is_active = (CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date)
WHERE course_id IN (SELECT id FROM gw_courses WHERE course_code = 'MUS 240');
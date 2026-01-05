-- Rename "All Members" to "All Students" in messenger_groups
UPDATE public.messenger_groups 
SET name = 'All Students', 
    description = 'All active Glee Club students and super admins'
WHERE name = 'All Members';

-- Also update gw_message_groups if it exists
UPDATE public.gw_message_groups 
SET name = 'All Students', 
    description = 'All active Glee Club students'
WHERE name = 'All Members';
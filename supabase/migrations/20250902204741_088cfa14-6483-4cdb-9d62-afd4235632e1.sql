-- Fix the username permissions to use correct module name
UPDATE public.username_permissions 
SET module_name = 'librarian'
WHERE user_email IN ('madisynwashington@spelman.edu', 'alexandrawilliams@spelman.edu') 
AND module_name = 'music-library';
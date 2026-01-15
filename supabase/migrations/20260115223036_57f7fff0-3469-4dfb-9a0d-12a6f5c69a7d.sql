-- Fix module IDs to match CourseModules.tsx
UPDATE public.lh100_module_resources SET module_id = 'lh-1' WHERE module_id = 'lh100-week-1';
UPDATE public.lh100_module_resources SET module_id = 'lh-2' WHERE module_id = 'lh100-week-2';
UPDATE public.lh100_module_resources SET module_id = 'lh-3' WHERE module_id = 'lh100-week-3';
UPDATE public.lh100_module_resources SET module_id = 'lh-4' WHERE module_id = 'lh100-week-4';
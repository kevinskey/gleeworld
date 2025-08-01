-- Fix Allana's role - she's an executive board member so should be 'member'
UPDATE public.profiles 
SET role = 'member' 
WHERE id = 'c9260ed4-144d-439b-be51-bd0f387b5ae6';
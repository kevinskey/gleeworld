-- Update just the specific user's role in the profiles table
UPDATE public.profiles 
SET role = 'super-admin'
WHERE id = '4e6c2ec0-1f83-449a-a984-8920f6056ab5';
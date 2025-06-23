
-- First, let's see what the current check constraint allows
-- and then update it to allow the standard role values

-- Drop the existing check constraint that's causing issues
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add a new check constraint that allows the correct role values
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('user', 'admin', 'super-admin'));

-- Check and create RLS policies for gw_profiles table
-- First, ensure RLS is enabled
ALTER TABLE public.gw_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own profile
CREATE POLICY IF NOT EXISTS "Users can view their own profile" 
ON public.gw_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to update their own profile
CREATE POLICY IF NOT EXISTS "Users can update their own profile" 
ON public.gw_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy for users to insert their own profile (for new users)
CREATE POLICY IF NOT EXISTS "Users can create their own profile" 
ON public.gw_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy for admins to manage all profiles
CREATE POLICY IF NOT EXISTS "Admins can manage all profiles" 
ON public.gw_profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create a trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.gw_profiles (
    user_id, 
    email, 
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION 
  WHEN unique_violation THEN
    -- Profile already exists, do nothing
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
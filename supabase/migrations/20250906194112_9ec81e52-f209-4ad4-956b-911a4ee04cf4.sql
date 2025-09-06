-- Fix critical RLS policies that are causing auth issues
-- Only create policies that don't already exist

-- Fix missing profile policies for user authentication
DO $$ 
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gw_profiles' 
        AND policyname = 'Allow users to view their own profile'
    ) THEN
        CREATE POLICY "Allow users to view their own profile" 
        ON public.gw_profiles 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gw_profiles' 
        AND policyname = 'Allow users to update their own profile'
    ) THEN
        CREATE POLICY "Allow users to update their own profile" 
        ON public.gw_profiles 
        FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gw_profiles' 
        AND policyname = 'Allow authenticated users to create profile'
    ) THEN
        CREATE POLICY "Allow authenticated users to create profile" 
        ON public.gw_profiles 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create the auto-profile creation function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.gw_profiles (user_id, email, full_name, role, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'student',
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate entries
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it works
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Check which policies already exist and create only missing ones

-- Check if user_dashboard_data view needs any special handling
-- (Views inherit permissions from their underlying tables)

-- Create INSERT policy for user_payments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_payments' 
    AND policyname = 'Users can create their own payments'
  ) THEN
    CREATE POLICY "Users can create their own payments" 
    ON public.user_payments
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- Create UPDATE policy for user_payments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_payments' 
    AND policyname = 'Users can update their own payments'
  ) THEN
    CREATE POLICY "Users can update their own payments" 
    ON public.user_payments
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END$$;

-- Create INSERT policy for gw_notifications if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'gw_notifications' 
    AND policyname = 'Users can create their own notifications'
  ) THEN
    CREATE POLICY "Users can create their own notifications" 
    ON public.gw_notifications
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- Additional policy for gw_profiles INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'gw_profiles' 
    AND policyname = 'Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile" 
    ON public.gw_profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- Additional policy for gw_profiles UPDATE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'gw_profiles' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" 
    ON public.gw_profiles
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END$$;
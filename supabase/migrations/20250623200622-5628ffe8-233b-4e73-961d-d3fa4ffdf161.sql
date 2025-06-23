
-- Check existing policies first, then create only the missing ones
DO $$
BEGIN
    -- Create SELECT policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'contracts_v2' 
        AND policyname = 'Users can view their own contracts'
    ) THEN
        CREATE POLICY "Users can view their own contracts" 
        ON public.contracts_v2 
        FOR SELECT 
        USING (auth.uid() = created_by);
    END IF;

    -- Create INSERT policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'contracts_v2' 
        AND policyname = 'Users can create their own contracts'
    ) THEN
        CREATE POLICY "Users can create their own contracts" 
        ON public.contracts_v2 
        FOR INSERT 
        WITH CHECK (auth.uid() = created_by);
    END IF;

    -- Create UPDATE policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'contracts_v2' 
        AND policyname = 'Users can update their own contracts'
    ) THEN
        CREATE POLICY "Users can update their own contracts" 
        ON public.contracts_v2 
        FOR UPDATE 
        USING (auth.uid() = created_by);
    END IF;
END $$;

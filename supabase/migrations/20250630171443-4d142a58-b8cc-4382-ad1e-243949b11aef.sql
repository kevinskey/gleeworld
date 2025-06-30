
-- First, let's check if there are any hidden policies or issues
-- Drop the table's RLS entirely and recreate with the most basic policy

ALTER TABLE public.w9_forms DISABLE ROW LEVEL SECURITY;

-- Clean slate - drop ALL policies
DO $$ 
DECLARE 
    pol_name text;
BEGIN 
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'w9_forms' AND schemaname = 'public'
    LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || pol_name || '" ON public.w9_forms';
    END LOOP; 
END $$;

-- Re-enable RLS
ALTER TABLE public.w9_forms ENABLE ROW LEVEL SECURITY;

-- Create the most permissive policy possible for INSERT
CREATE POLICY "w9_insert_all" ON public.w9_forms 
    FOR INSERT 
    TO public
    WITH CHECK (true);

-- Create SELECT policies
CREATE POLICY "w9_select_own" ON public.w9_forms 
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "w9_select_admin" ON public.w9_forms 
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
        )
    );

-- Create DELETE policies  
CREATE POLICY "w9_delete_own" ON public.w9_forms 
    FOR DELETE 
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "w9_delete_admin" ON public.w9_forms 
    FOR DELETE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
        )
    );

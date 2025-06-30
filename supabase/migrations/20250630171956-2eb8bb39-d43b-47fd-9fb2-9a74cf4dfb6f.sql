
-- Drop all existing policies and create the most permissive ones possible
ALTER TABLE public.w9_forms DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "w9_insert_all" ON public.w9_forms;
DROP POLICY IF EXISTS "w9_select_own" ON public.w9_forms;
DROP POLICY IF EXISTS "w9_select_admin" ON public.w9_forms;
DROP POLICY IF EXISTS "w9_delete_own" ON public.w9_forms;
DROP POLICY IF EXISTS "w9_delete_admin" ON public.w9_forms;
DROP POLICY IF EXISTS "Allow all W9 submissions" ON public.w9_forms;
DROP POLICY IF EXISTS "View own W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Admin view all W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Delete own W9 forms" ON public.w9_forms;
DROP POLICY IF EXISTS "Admin delete any W9 forms" ON public.w9_forms;

-- Re-enable RLS
ALTER TABLE public.w9_forms ENABLE ROW LEVEL SECURITY;

-- Create the most permissive INSERT policy for both authenticated and anonymous users
CREATE POLICY "allow_all_inserts_w9" ON public.w9_forms 
    FOR INSERT 
    TO public
    WITH CHECK (true);

-- Create the most permissive SELECT policy for both authenticated and anonymous users
CREATE POLICY "allow_all_selects_w9" ON public.w9_forms 
    FOR SELECT 
    TO public
    USING (true);

-- Create the most permissive DELETE policy for authenticated users
CREATE POLICY "allow_authenticated_deletes_w9" ON public.w9_forms 
    FOR DELETE 
    TO authenticated
    USING (true);

-- Ensure RLS is enabled and proper policies exist for wardrobe_items so exec board and admins can manage inventory

-- Enable Row Level Security on wardrobe_items
ALTER TABLE IF EXISTS public.wardrobe_items ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view wardrobe items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wardrobe_items' AND policyname = 'Wardrobe items are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Wardrobe items are viewable by authenticated users"
    ON public.wardrobe_items
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Policy: Executive board members and admins can insert wardrobe items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wardrobe_items' AND policyname = 'Exec/admin can insert wardrobe items'
  ) THEN
    CREATE POLICY "Exec/admin can insert wardrobe items"
    ON public.wardrobe_items
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_executive_board_member_or_admin());
  END IF;
END $$;

-- Policy: Executive board members and admins can update wardrobe items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wardrobe_items' AND policyname = 'Exec/admin can update wardrobe items'
  ) THEN
    CREATE POLICY "Exec/admin can update wardrobe items"
    ON public.wardrobe_items
    FOR UPDATE
    TO authenticated
    USING (public.is_executive_board_member_or_admin())
    WITH CHECK (public.is_executive_board_member_or_admin());
  END IF;
END $$;

-- Policy: Executive board members and admins can delete wardrobe items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wardrobe_items' AND policyname = 'Exec/admin can delete wardrobe items'
  ) THEN
    CREATE POLICY "Exec/admin can delete wardrobe items"
    ON public.wardrobe_items
    FOR DELETE
    TO authenticated
    USING (public.is_executive_board_member_or_admin());
  END IF;
END $$;
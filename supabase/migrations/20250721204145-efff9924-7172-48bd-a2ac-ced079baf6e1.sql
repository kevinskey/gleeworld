-- Enable Row Level Security if not already enabled
ALTER TABLE public.gw_member_communications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for gw_member_communications (only if they don't exist)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gw_member_communications' AND policyname = 'Users can view communications they sent or received') THEN
        CREATE POLICY "Users can view communications they sent or received"
        ON public.gw_member_communications
        FOR SELECT
        USING (
          auth.uid() = created_by 
          OR auth.uid() = recipient_id 
          OR recipient_id IS NULL -- General notices can be viewed by all
          OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
          )
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gw_member_communications' AND policyname = 'Only admins can create member communications') THEN
        CREATE POLICY "Only admins can create member communications"
        ON public.gw_member_communications
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
          )
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gw_member_communications' AND policyname = 'Only admins can update member communications') THEN
        CREATE POLICY "Only admins can update member communications"
        ON public.gw_member_communications
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
          )
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gw_member_communications' AND policyname = 'Only admins can delete member communications') THEN
        CREATE POLICY "Only admins can delete member communications"
        ON public.gw_member_communications
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
          )
        );
    END IF;
END $$;